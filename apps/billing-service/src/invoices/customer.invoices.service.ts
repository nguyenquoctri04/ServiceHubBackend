import { ConfigService } from "@nestjs/config";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { PrismaService } from "../prisma/prisma.service";
import { CustomerInvoicesQueryDto } from "@app/common/dto/customer/billing";
import { randomUUID } from "crypto";
import { PayOSService } from "../payos/payos.service";
import { CustomerPaymentsService } from "../payments/customer.payments.service";
import { Prisma } from "@prisma/client-billing";

@Injectable()
export class CustomerInvoicesService {
    private readonly logger = new Logger(CustomerInvoicesService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject("CONTRACT_SERVICE")
        private readonly contractClient: ClientProxy,
        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,
        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
        private readonly payOS: PayOSService,
        private readonly customerPayments: CustomerPaymentsService,
        private readonly configService: ConfigService,
    ) {}

    async fetchInvoices(
        query: CustomerInvoicesQueryDto,
        customerId: string | null,
    ) {
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
                const signedAt = contractsById.get(invoice.contractId)?.contract
                    ?.signedAt;
                return signedAt &&
                    contractsById.get(invoice.contractId)?.service?.billingRule
                        ?.billingFrequency === "ONE_TIME"
                    ? new Date(
                          new Date(signedAt).getTime() + 2 * 60 * 60 * 1000,
                      ).toISOString()
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
            this.prisma.payment.deleteMany({
                where: { invoiceId: { in: ids } },
            }),
            this.prisma.invoiceItem.deleteMany({
                where: { invoiceId: { in: ids } },
            }),
            this.prisma.invoice.deleteMany({ where: { id: { in: ids } } }),
        ]);
        return { count: ids.length };
    }

    async cancelContractPrepaymentInvoice(contractId: string) {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                contractId,
                status: { in: ["UNPAID", "OVERDUE", "PAID"] },
            },
            select: { id: true, status: true },
        });

        if (invoices.some((invoice) => invoice.status === "PAID")) {
            throw new RpcException({
                statusCode: 409,
                message:
                    "Hóa đơn của dịch vụ đã được thanh toán nên không thể hủy dịch vụ.",
            });
        }

        const ids = invoices.map(({ id }) => id);
        if (ids.length === 0) return { count: 0 };

        await this.prisma.$transaction([
            this.prisma.payment.deleteMany({
                where: { invoiceId: { in: ids } },
            }),
            this.prisma.invoiceItem.deleteMany({
                where: { invoiceId: { in: ids } },
            }),
            this.prisma.invoice.deleteMany({ where: { id: { in: ids } } }),
        ]);
        return { count: ids.length };
    }

    async createQrCode(params: { invoiceId: string; customerId: string }) {
        let createdPaymentLinkId: string | undefined;
        const paymentLink = await this.prisma.$transaction(
            async (tx) => {
                // Serialize link creation per invoice across all service instances.
                await tx.$queryRaw`
                    SELECT pg_advisory_xact_lock(
                        hashtextextended(${params.invoiceId}, 0)
                    ) IS NULL AS "lockResult"
                `;

                return this.createQrCodeWithLock(params, tx, (paymentLinkId) => {
                    createdPaymentLinkId = paymentLinkId;
                });
            },
            { maxWait: 10_000, timeout: 30_000 },
        );

        // Redis scheduling is best effort and happens after the DB commit, so a
        // Redis outage cannot roll back the durable payment-link record.
        if (createdPaymentLinkId) {
            try {
                await this.customerPayments.scheduleReconciliation(
                    params.invoiceId,
                    createdPaymentLinkId,
                );
            } catch (error) {
                this.logger.warn(
                    `Could not schedule reconciliation for payment link ${createdPaymentLinkId}: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }
        return paymentLink;
    }

    private async createQrCodeWithLock(
        params: { invoiceId: string; customerId: string },
        tx: Prisma.TransactionClient,
        onPaymentLinkCreated: (paymentLinkId: string) => void,
    ) {
        const { invoiceId, customerId } = params;
        const invoice = await tx.invoice.findFirst({
            where: {
                AND: [
                    { id: invoiceId },
                    { customerId: customerId },
                    {
                        status: {
                            in: ["UNPAID", "OVERDUE"],
                        },
                    },
                ],
            },
            include: {
                items: { orderBy: { createdAt: "asc" } },
                payments: { orderBy: { createdAt: "desc" }, take: 1 },
            },
        });

        if (!invoice) {
            throw new RpcException({
                statusCode: 404,
                message: "Không tìm thấy hóa đơn có thể thanh toán.",
            });
        }

        const existingPayment = invoice.payments[0];
        if (existingPayment) {
            const existingLink = await this.payOS.getPaymentLinkStatus(
                existingPayment.paymentLinkId,
            );
            let savedLinkData = {
                checkoutUrl: existingPayment.checkOutUrl,
                qrCode: existingPayment.qrCode,
            };
            if (!savedLinkData.checkoutUrl || !savedLinkData.qrCode) {
                const cachedLinkData =
                    await this.customerPayments.getPaymentLinkData(
                        existingPayment.paymentLinkId,
                    );
                if (cachedLinkData) {
                    savedLinkData = cachedLinkData;
                    await tx.payment.update({
                        where: { id: existingPayment.id },
                        data: {
                            checkOutUrl: cachedLinkData.checkoutUrl,
                            qrCode: cachedLinkData.qrCode,
                        },
                    });
                }
            }

            // ========== Test xong bỏ comment chỗ này ==========
            if (
                existingLink.status === "PAID"
                // && existingLink.amountPaid >= Number(invoice.total)
            ) {
                const invoiceUpdate = await tx.invoice.updateMany({
                    where: {
                        id: invoice.id,
                        status: { in: ["UNPAID", "OVERDUE"] },
                    },
                    data: { status: "PAID", updatedAt: new Date() },
                });
                if (invoiceUpdate.count === 0) {
                    const currentInvoice = await tx.invoice.findUnique({
                        where: { id: invoice.id },
                        select: { status: true },
                    });
                    if (currentInvoice?.status !== "PAID") {
                        throw new RpcException({
                            statusCode: 409,
                            message: "Trạng thái hóa đơn đã thay đổi, vui lòng tải lại.",
                        });
                    }
                    await this.customerPayments.removeReconciliation(
                        existingPayment.paymentLinkId,
                    );
                    return {
                        ...existingLink,
                        ...savedLinkData,
                    };
                }

                await tx.payment.update({
                    where: { id: existingPayment.id },
                    data: {
                        paymentMethod: "TRANSFER",
                        status: "SUCCESS",
                        paidAt: existingLink.paidAt
                            ? new Date(existingLink.paidAt)
                            : new Date(),
                    },
                });
                await this.customerPayments.removeReconciliation(
                    existingPayment.paymentLinkId,
                );
                return {
                    ...existingLink,
                    ...savedLinkData,
                };
            }

            if (
                ["PENDING", "PROCESSING", "UNDERPAID"].includes(
                    existingLink.status,
                )
            ) {
                await tx.payment.update({
                    where: { id: existingPayment.id },
                    data: { status: "PENDING", paidAt: null },
                });
                if (!savedLinkData.checkoutUrl || !savedLinkData.qrCode) {
                    throw new RpcException({
                        statusCode: 409,
                        message:
                            "Không lấy được thông tin QR đã lưu. Liên kết cũ vẫn được giữ nguyên.",
                    });
                }
                return {
                    ...existingLink,
                    ...savedLinkData,
                };
            }

            throw new RpcException({
                statusCode: 409,
                message: "Payment link is no longer available. Contact support.",
            });
        }

        // const amount = Number(invoice.total);
        // if (!Number.isSafeInteger(amount) || amount <= 0) {
        //     throw new RpcException({
        //         statusCode: 400,
        //         message: "Số tiền hóa đơn phải là số nguyên dương hợp lệ để thanh toán.",
        //     });
        // }

        const amount = 2000;

        const returnUrl = this.configService.get<string>("PAYOS_RETURN_URL");
        const cancelUrl = this.configService.get<string>("PAYOS_CANCEL_URL");
        if (!returnUrl || !cancelUrl) {
            throw new RpcException({
                statusCode: 500,
                message: "Chưa cấu hình PAYOS_RETURN_URL và PAYOS_CANCEL_URL.",
            });
        }

        const servicePriceIds = [
            ...new Set(
                invoice.items
                    .map((item) => item.servicePriceId)
                    .filter((id): id is string => Boolean(id)),
            ),
        ];

        const [customerInformation, priceDetails] = await Promise.all([
            this.secureRpc.send<any>(
                this.identityClient,
                { cmd: CustomerPatterns.GET_CUSTOMER_INFORMATION },
                { customerId },
            ),
            servicePriceIds.length > 0
                ? this.secureRpc.send<any[]>(
                      this.catalogClient,
                      { cmd: CustomerPatterns.GET_SERVICE_PRICE_DETAILS },
                      { servicePriceIds },
                  )
                : Promise.resolve([]),
        ]);

        const serviceNameByPriceId = new Map<string, string>();
        for (const detail of priceDetails) {
            if (
                typeof detail.servicePriceId === "string" &&
                typeof detail.service?.name === "string"
            ) {
                serviceNameByPriceId.set(
                    detail.servicePriceId,
                    detail.service.name,
                );
            }
        }

        const amountItems = invoice.items.map((item, index) => {
            const itemAmount = Number(item.amount);
            if (!Number.isFinite(itemAmount) || itemAmount < 0) {
                throw new RpcException({
                    statusCode: 400,
                    message: "Chi tiết hóa đơn có số tiền không hợp lệ.",
                });
            }

            return {
                name:
                    serviceNameByPriceId.get(item.servicePriceId ?? "") ||
                    `Dịch vụ ${index + 1}`,
                quantity: 1,
                price: Math.round(itemAmount),
            };
        });

        const payOsItems =
            amountItems.length > 0 &&
            amountItems.reduce((sum, item) => sum + item.price, 0) === amount
                ? amountItems
                : [
                      {
                          name: `Hóa đơn ${invoice.invoiceNumber}`,
                          quantity: 1,
                          price: amount,
                      },
                  ];

        const buyerName =
            customerInformation?.personalInfo?.fullName?.trim() ||
            customerInformation?.contactInfo?.email ||
            "Khách hàng";
        const buyerEmail = customerInformation?.contactInfo?.email || "";
        const buyerAddress =
            customerInformation?.personalInfo?.permanentAddress?.trim() ||
            "Chưa cung cấp";

        const paymentLink = await this.payOS.createPaymentLink({
            amount,
            // Một số ngân hàng giới hạn nội dung chuyển khoản ở 9 ký tự.
            description: invoice.invoiceNumber,
            returnUrl,
            cancelUrl,
            buyerName,
            buyerEmail,
            buyerAddress,
            items: payOsItems,
            taxPercentage: -2,
        });
        onPaymentLinkCreated(paymentLink.paymentLinkId);
        const paymentData = {
            paymentMethod: "TRANSFER" as const,
            paymentLinkId: paymentLink.paymentLinkId,
            qrCode: paymentLink.qrCode,
            checkOutUrl: paymentLink.checkoutUrl,
            status: "PENDING" as const,
            paidAt: null,
        };

        await tx.payment.create({
            data: {
                invoiceId: invoice.id,
                ...paymentData,
                createdAt: new Date(),
            },
        });

        return paymentLink;
    }

    async checkPaymentStatus(params: {
        invoiceId: string;
        customerId: string;
    }) {
        const invoice = await this.prisma.invoice.findFirst({
            where: {
                id: params.invoiceId,
                customerId: params.customerId,
            },
            include: {
                payments: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });

        if (!invoice) {
            throw new RpcException({
                statusCode: 404,
                message: "Không tìm thấy hóa đơn.",
            });
        }

        const payment = invoice.payments[0];
        if (
            !payment ||
            payment.status !== "PENDING" ||
            invoice.status === "PAID" ||
            !["UNPAID", "OVERDUE"].includes(invoice.status)
        ) {
            return {
                checked: false,
                invoiceStatus: invoice.status,
                paymentStatus: payment?.status ?? null,
            };
        }

        return this.customerPayments.checkPaymentStatus(
            invoice.id,
            payment.paymentLinkId,
        );
    }
}
