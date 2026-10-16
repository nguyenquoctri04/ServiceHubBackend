import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { PrismaService } from "../prisma/prisma.service";
import { CustomerInvoicesQueryDto } from "@app/common/dto/customer/billing";
import { randomUUID } from "crypto";

@Injectable()
export class CustomerInvoicesService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject("CONTRACT_SERVICE") private readonly contractClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    async fetchInvoices(query: CustomerInvoicesQueryDto, customerId: string | null) {
        if (!customerId) {
            return [];
        }

        const statuses = ["UNPAID", "PAID", "OVERDUE"] as const;
        const status = statuses.find((value) => value === query?.status);
        const search =
            typeof query?.search === "string" ? query.search.trim() : "";

        const invoices = await this.prisma.invoice.findMany({
            where: {
                customerId,
                ...(status ? { status } : {}),
                ...(search
                    ? {
                          invoiceNumber: {
                              contains: search,
                              mode: "insensitive",
                          },
                      }
                    : {}),
            },
            orderBy: { createdAt: "desc" },
            include: {
                items: { orderBy: { createdAt: "asc" } },
                payments: { orderBy: { createdAt: "desc" } },
            },
        });

        const contractIds = new Set(
            invoices
                .map((invoice) => invoice.contractId)
                .filter((id): id is string => Boolean(id)),
        );

        const billingPeriodsById = new Map<
            string,
            { id: string; periodStart: string; periodEnd: string }
        >();

        let contractDetails: any[] = [];
        if (contractIds.size > 0) {
            try {
                const contractsResult = await this.secureRpc.send<any>(
                    this.contractClient,
                    { cmd: CustomerPatterns.GET_USED_SERVICES },
                    { customerId, page: 1, pageSize: 1000 },
                );
                contractDetails = (contractsResult?.data ?? []).filter(
                    (contract: any) => contractIds.has(contract.id),
                );
            } catch {
                // The invoice list can still be returned if contract enrichment is unavailable.
            }
        }
        const contractsById = new Map(
            contractDetails.map((detail) => [detail.id, detail]),
        );
        for (const detail of contractDetails) {
            for (const period of detail?.billingPeriods ?? []) {
                billingPeriodsById.set(period.id, period);
            }
        }

        return invoices.map(({ items, payments, ...invoice }) => ({
            ...invoice,
            isPrepayment:
                contractsById.get(invoice.contractId)?.service?.billingRule
                    ?.billingFrequency === "ONE_TIME",
            paymentDeadlineAt: (() => {
                const signedAt = contractsById.get(invoice.contractId)?.contract?.signedAt;
                return signedAt && contractsById.get(invoice.contractId)?.service?.billingRule
                    ?.billingFrequency === "ONE_TIME"
                    ? new Date(new Date(signedAt).getTime() + 2 * 60 * 60 * 1000).toISOString()
                    : null;
            })(),
            total: Number(invoice.total),
            billingPeriod: invoice.billingPeriodId
                ? billingPeriodsById.get(invoice.billingPeriodId)
                : undefined,
            items: items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                amount: Number(item.amount),
            })),
            payment: payments[0]
                ? {
                      ...payments[0],
                      paymentMethod: payments[0].paymentMethod,
                      paidAt: payments[0].paidAt?.toISOString(),
                      createdAt: payments[0].createdAt.toISOString(),
                  }
                : undefined,
        }));
    }

    async createPrepaymentInvoice(input: {
        contractId: string;
        customerId: string;
        providerId: string;
        servicePriceId: string;
        quantity: number;
        unit: string;
        unitPrice: number;
    }) {
        const existing = await this.prisma.invoice.findFirst({
            where: { contractId: input.contractId },
            select: { id: true, status: true },
        });
        if (existing) return existing;

        const quantity = Number(input.quantity);
        const unitPrice = Number(input.unitPrice);
        const amount = quantity * unitPrice;
        const now = new Date();

        try {
            return await this.prisma.invoice.create({
                data: {
                    invoiceNumber: `INV-PRE-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
                    customerId: input.customerId,
                    contractId: input.contractId,
                    providerId: input.providerId,
                    total: amount,
                    status: "UNPAID",
                    createdAt: now,
                    updatedAt: now,
                    items: {
                        create: {
                            servicePriceId: input.servicePriceId,
                            quantity,
                            unit: input.unit,
                            unitPrice,
                            amount,
                            createdAt: now,
                        },
                    },
                },
                select: { id: true, status: true },
            });
        } catch (error) {
            const duplicate = await this.prisma.invoice.findFirst({
                where: { contractId: input.contractId },
                select: { id: true, status: true },
            });
            if (duplicate) return duplicate;
            throw error;
        }
    }

    async deleteContractPrepaymentInvoice(contractId: string) {
        const expired = await this.prisma.invoice.findMany({
            where: {
                contractId,
                status: { in: ["UNPAID", "OVERDUE"] },
            },
            select: { id: true },
        });
        if (expired.length === 0) return { count: 0 };

        const ids = expired.map(({ id }) => id);
        await this.prisma.$transaction([
            this.prisma.payment.deleteMany({ where: { invoiceId: { in: ids } } }),
            this.prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: ids } } }),
            this.prisma.invoice.deleteMany({ where: { id: { in: ids } } }),
        ]);
        return { count: ids.length };
    }
}
