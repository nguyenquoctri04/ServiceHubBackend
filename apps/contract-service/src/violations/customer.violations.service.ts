import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { SecureRpcService } from "@app/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomerViolationsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject("CATALOG_SERVICE") private readonly catalogClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    async getViolationRules() {
        const response = await this.prisma.violationRule.findMany({
            where: {
                AND: [{ targetType: "PROVIDER" }, { isActive: true }],
            },
            select: {
                id: true,
                name: true,
            },
        });

        return response;
    }

    async createViolationReport(data: {
        customerId: string;
        contractId: string;
        serviceId: string;
        violationRuleId: string;
        description: string;
        occurredAt: string;
        evidenceUrls?: string[];
    }) {
        const contract = await this.prisma.contract.findFirst({
            where: {
                id: data.contractId,
                customerId: data.customerId,
                status: "ACTIVE",
            },
            select: {
                id: true,
                providerId: true,
                customerId: true,
                services: { select: { servicePriceId: true } },
            },
        });

        if (!contract) {
            throw new RpcException({
                statusCode: 403,
                message: "Chỉ được báo cáo vi phạm khi bạn có hợp đồng đang hoạt động.",
            });
        }

        const servicePriceIds = [
            ...new Set(contract.services.map((item) => item.servicePriceId)),
        ];
        const priceDetails = servicePriceIds.length
            ? await this.secureRpc.send<any[]>(
                  this.catalogClient,
                  { cmd: CustomerPatterns.GET_SERVICE_PRICE_DETAILS },
                  { servicePriceIds },
              )
            : [];
        const serviceBelongsToContract = priceDetails.some(
            (price) =>
                price.service?.id === data.serviceId &&
                price.service?.providerId === contract.providerId,
        );

        if (!serviceBelongsToContract) {
            throw new RpcException({
                statusCode: 403,
                message: "Dịch vụ này không thuộc hợp đồng đang hoạt động của bạn.",
            });
        }

        const rule = await this.prisma.violationRule.findFirst({
            where: {
                id: data.violationRuleId,
                targetType: "PROVIDER",
                isActive: true,
            },
            select: { id: true },
        });

        if (!rule) {
            throw new RpcException({
                statusCode: 400,
                message: "Loại vi phạm không hợp lệ hoặc đã ngừng sử dụng.",
            });
        }

        if (!data.description.trim()) {
            throw new RpcException({
                statusCode: 400,
                message: "Vui lòng nhập nội dung vi phạm.",
            });
        }

        const occurredAt = new Date(data.occurredAt);
        if (Number.isNaN(occurredAt.getTime()) || occurredAt > new Date()) {
            throw new RpcException({
                statusCode: 400,
                message: "Thời điểm xảy ra vi phạm không hợp lệ.",
            });
        }

        const evidenceUrls = [...new Set(data.evidenceUrls ?? [])];
        if (evidenceUrls.length > 5) {
            throw new RpcException({
                statusCode: 400,
                message: "Bạn chỉ được gửi tối đa 5 hình ảnh bằng chứng.",
            });
        }
        if (
            evidenceUrls.some((fileUrl) => {
                try {
                    return new URL(fileUrl).hostname !== "res.cloudinary.com";
                } catch {
                    return true;
                }
            })
        ) {
            throw new RpcException({
                statusCode: 400,
                message: "Ảnh bằng chứng phải được tải lên hệ thống trước khi gửi.",
            });
        }

        const violation = await this.prisma.$transaction(async (tx) => {
            const existingReport = await tx.violationCase.findFirst({
                where: {
                    contractId: contract.id,
                    reportedBy: contract.customerId,
                    serviceId: data.serviceId,
                    status: { not: "CANCELLED" },
                },
                select: { id: true },
            });

            if (existingReport) {
                throw new RpcException({
                    statusCode: 409,
                    message: "Bạn đã gửi báo cáo vi phạm cho hợp đồng này.",
                });
            }

            return tx.violationCase.create({
                data: {
                    violationRuleId: rule.id,
                    contractId: contract.id,
                    providerId: contract.providerId,
                    reportedBy: contract.customerId,
                    serviceId: data.serviceId,
                    status: "REPORTED",
                    description: data.description.trim(),
                    occurredAt,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    evidence: {
                        create: evidenceUrls.map((fileUrl) => ({ fileUrl })),
                    },
                },
                include: { violationRule: true, evidence: true },
            });
        });

        return violation;
    }
}
