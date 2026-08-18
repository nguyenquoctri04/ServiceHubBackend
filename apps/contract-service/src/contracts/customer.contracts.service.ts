import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateServiceBookingCommand } from "@app/common/dto/customer/contract";
import { createHash, randomUUID } from "crypto";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";

interface PopularServiceInput {
    serviceId: string;
    providerId: string;
}

@Injectable()
export class CustomerContractsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,

        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,

        @Inject("NOTIFICATION_SERVICE")
        private readonly notificationClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async getPopularServices(servicePriceIds: string[], limit: number) {
        if (servicePriceIds.length === 0) {
            return [];
        }

        const contractServices = await this.prisma.contractService.findMany({
            where: {
                servicePriceId: {
                    in: servicePriceIds,
                },
                contract: {
                    status: {
                        in: ["ACTIVE", "EXPIRED"],
                    },
                },
            },
            select: {
                servicePriceId: true,
            },
        });

        const countMap = new Map<string, number>();

        for (const item of contractServices) {
            countMap.set(
                item.servicePriceId,
                (countMap.get(item.servicePriceId) ?? 0) + 1,
            );
        }

        return Array.from(countMap.entries())
            .map(([servicePriceId, count]) => ({
                servicePriceId,
                count,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    async getMarketplaceRestrictions(params: {
        customerId: string;
        serviceIds: string[];
        providerIds: string[];
    }) {
        const { customerId, serviceIds, providerIds } = params;

        const now = new Date();

        const restrictions = await this.prisma.restriction.findMany({
            where: {
                customerId,
                isDeleted: false,
                startAt: {
                    lte: now,
                },
                OR: [
                    {
                        endAt: null,
                    },
                    {
                        endAt: {
                            gt: now,
                        },
                    },
                ],
                AND: [
                    {
                        OR: [
                            {
                                scopeType: "PLATFORM",
                            },
                            {
                                scopeType: "PROVIDER",
                                providerId: {
                                    in: providerIds,
                                },
                            },
                            {
                                scopeType: "SERVICE",
                                serviceId: {
                                    in: serviceIds,
                                },
                            },
                        ],
                    },
                ],
            },
            select: {
                scopeType: true,
                providerId: true,
                serviceId: true,
            },
        });

        const blockedProviderIds = new Set<string>();
        const blockedServiceIds = new Set<string>();

        let platformBlocked = false;

        for (const restriction of restrictions) {
            switch (restriction.scopeType) {
                case "PLATFORM":
                    platformBlocked = true;
                    break;

                case "PROVIDER":
                    if (restriction.providerId) {
                        blockedProviderIds.add(restriction.providerId);
                    }
                    break;

                case "SERVICE":
                    if (restriction.serviceId) {
                        blockedServiceIds.add(restriction.serviceId);
                    }
                    break;
            }
        }

        return {
            platformBlocked,
            blockedProviderIds: [...blockedProviderIds],
            blockedServiceIds: [...blockedServiceIds],
        };
    }

    /**
     * Dùng cho trang chi tiết 1 service — kiểm tra cả 2 khả năng:
     * bị cấm ở cấp provider (scopeType=PROVIDER) HOẶC cấp service này
     * (scopeType=SERVICE), chỉ cần 1 query.
     */
    async checkServiceAccess(
        serviceId: string,
        providerId: string,
        customerId?: string,
    ): Promise<{ blocked: boolean }> {
        if (!customerId) return { blocked: false };

        const now = new Date();

        const restriction = await this.prisma.restriction.findFirst({
            where: {
                customerId,
                isDeleted: false,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
                AND: {
                    OR: [
                        { scopeType: "PROVIDER", providerId },
                        { scopeType: "SERVICE", serviceId },
                    ],
                },
            },
            select: { id: true },
        });

        return { blocked: !!restriction };
    }

    /**
     * Provider có bị cấm với customer này không — dựa trên Restriction
     * đang còn hiệu lực (chưa xoá mềm, trong khoảng startAt..endAt).
     */
    async checkProviderAccess(
        providerId: string,
        customerId?: string,
    ): Promise<{ blocked: boolean }> {
        if (!customerId) return { blocked: false };

        const now = new Date();

        const restriction = await this.prisma.restriction.findFirst({
            where: {
                scopeType: "PROVIDER",
                providerId,
                customerId,
                isDeleted: false,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
            },
            select: { id: true },
        });

        return { blocked: !!restriction };
    }

    /**
     * Gộp 2 việc trong 1 lần gọi:
     * - usageCounts: "lượt đăng ký thành công" để catalog-service tính
     *   dịch vụ nổi bật.
     * - blockedServiceIds: service nào trong danh sách đang bị cấm riêng
     *   với customer này (Restriction scopeType=SERVICE).
     */
    async getProviderServiceInsights(
        items: Array<{ serviceId: string; servicePriceIds: string[] }>,
        customerId?: string,
    ): Promise<{
        usageCounts: Array<{ serviceId: string; count: number }>;
        blockedServiceIds: string[];
    }> {
        const usageCounts = await Promise.all(
            items.map(async ({ serviceId, servicePriceIds }) => {
                if (servicePriceIds.length === 0) {
                    return { serviceId, count: 0 };
                }

                const count = await this.prisma.contractService.count({
                    where: {
                        servicePriceId: { in: servicePriceIds },
                        contract: {
                            status: { in: ["ACTIVE", "EXPIRED"] },
                            violationCases: {
                                none: {
                                    serviceId,
                                    actions: {
                                        some: {
                                            actionType: { not: "NO_ACTION" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                });

                return { serviceId, count };
            }),
        );

        let blockedServiceIds: string[] = [];

        if (customerId && items.length > 0) {
            const now = new Date();

            const restrictions = await this.prisma.restriction.findMany({
                where: {
                    scopeType: "SERVICE",
                    serviceId: { in: items.map((i) => i.serviceId) },
                    customerId,
                    isDeleted: false,
                    startAt: { lte: now },
                    OR: [{ endAt: null }, { endAt: { gte: now } }],
                },
                select: { serviceId: true },
            });

            blockedServiceIds = restrictions
                .map((r) => r.serviceId)
                .filter((id): id is string => !!id);
        }

        return { usageCounts, blockedServiceIds };
    }

    async createServiceBooking(command: CreateServiceBookingCommand) {
        const {
            customerId,
            servicePriceId,
            quantity,
            requireSignature,
            providerId,
            fromEmail,
        } = command;

        if (quantity < 1) {
            throw new BadRequestException("Số lượng không hợp lệ");
        }

        console.log(servicePriceId);

        const priceInfo = await this.secureRpc.send(
            this.catalogClient,
            { cmd: CustomerPatterns.VALIDATE_SERVICE_PRICE },
            { servicePriceId },
        );

        if (!priceInfo) {
            throw new BadRequestException(
                "Dịch vụ không tồn tại hoặc đã ngừng hoạt động.",
            );
        }

        // providerId client gửi lên phải khớp providerId thật của service —
        // tránh trường hợp gửi sai/giả providerId trong command.
        if (priceInfo.providerId !== providerId) {
            throw new BadRequestException("Thông tin dịch vụ không hợp lệ.");
        }

        const activeProviders = await this.secureRpc.send(
            this.identityClient,
            { cmd: CustomerPatterns.GET_PROVIDER_IN_POPULAR },
            { providerIds: [providerId] },
        );

        if (activeProviders.length === 0) {
            throw new BadRequestException("Nhà cung cấp đã ngừng hoạt động.");
        }

        const { blocked } = await this.checkServiceAccess(
            priceInfo.serviceId,
            providerId,
            customerId,
        );

        if (blocked) {
            throw new BadRequestException("Bạn không thể đặt dịch vụ này.");
        }

        const now = new Date();

        const contractNumber = `CTR-${Date.now()}-${randomUUID()
            .replace(/-/g, "")
            .slice(0, 8)
            .toUpperCase()}`;

        const result = await this.prisma.$transaction(async (tx) => {
            const contract = await tx.contract.create({
                data: {
                    providerId: providerId,
                    contractNumber: contractNumber,
                    customerId: customerId,
                    startDate: now,
                    status: "DRAFT",
                    requireSignature: requireSignature,
                    createdAt: now,
                    updatedAt: now,
                },
            });

            const contractService = await tx.contractService.create({
                data: {
                    contractId: contract.id,
                    servicePriceId: servicePriceId,
                    quantity: quantity,
                    createdAt: now,
                },
            });

            return {
                contract,
                contractService,
            };
        });

        const providerIdentityId = activeProviders[0].identityId;

        try {
            await this.secureRpc.send(
                this.notificationClient,
                { cmd: CustomerPatterns.NOTIFY_SERVICE_REGISTRATION },
                {
                    providerUserId: providerIdentityId,
                    providerId,
                    fromEmail: fromEmail ?? "Người dùng ẩn danh",
                    serviceName: priceInfo.serviceName,
                    contractNumber: result.contract.contractNumber,
                    requireSignature,
                    occurredAt: now.toISOString(),
                },
            );
        } catch (err) {
            console.error("Gửi thông báo cho provider thất bại:", err);
        }

        return true;
    }

    /**
     * Cấp hash của file hợp đồng cho signature-service ký — ĐỒNG THỜI xác
     * thực identityId đang yêu cầu ký có thực sự là 1 bên trong hợp đồng
     * đó không (customer hoặc chính provider). Không cho ký hộ.
     */
    async getContractFileHashForSigning(
        contractFileId: string,
        identityId: string,
    ) {
        const file = await this.prisma.contractFile.findUnique({
            where: { id: contractFileId },
            include: { contract: true },
        });

        if (!file) {
            throw new RpcException(
                new NotFoundException("Không tìm thấy file hợp đồng."),
            );
        }

        if (!file.hashContract) {
            throw new RpcException(
                new BadRequestException(
                    "File hợp đồng chưa được tính hash, không thể ký.",
                ),
            );
        }

        const isCustomer = file.contract.customerId === identityId;

        const providers = await this.secureRpc.send<
            Array<{ id: string; identityId: string }>
        >(
            this.identityClient,
            { cmd: CustomerPatterns.GET_PROVIDER_IN_POPULAR },
            { providerIds: [file.contract.providerId] },
        );

        const providerIdentityId = providers[0]?.identityId ?? null;
        const isProvider = providerIdentityId === identityId;

        if (!isCustomer && !isProvider) {
            throw new RpcException(
                new ForbiddenException("Bạn không có quyền ký hợp đồng này."),
            );
        }

        // Không tin field hashContract một cách mù quáng — tải lại PDF
        // thật, tính lại hash, đối chiếu ngay tại đây trước khi cho ký.
        const actualHash = await this.computeFileHash(file.pdfUrl);

        if (actualHash !== file.hashContract) {
            throw new RpcException(
                new BadRequestException(
                    "File hợp đồng đã bị thay đổi so với hash gốc, không thể ký.",
                ),
            );
        }

        return {
            hashContract: file.hashContract,
            contractId: file.contractId,
            providerId: file.contract.providerId,
            providerIdentityId,
            customerId: file.contract.customerId,
            isProviderSigning: isProvider,
        };
    }

    private async computeFileHash(pdfUrl: string): Promise<string> {
        const response = await fetch(pdfUrl);

        if (!response.ok) {
            throw new RpcException(
                new BadRequestException(
                    "Không thể tải file hợp đồng để xác minh hash.",
                ),
            );
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return createHash("sha256").update(buffer).digest("hex");
    }

    async getContractFileHashForVerify(contractFileId: string) {
        const contractFile = await this.prisma.contractFile.findUnique({
            where: {
                id: contractFileId,
            },
            select: {
                id: true,
                hashContract: true,
                providerIdentityId: true,
                customerId: true,
            },
        });

        if (!contractFile) {
            throw new RpcException({
                statusCode: 404,
                message: "Không tìm thấy file hợp đồng.",
            });
        }

        return {
            contractFileId: contractFile.id,
            hashContract: contractFile.hashContract,
            providerIdentityId: contractFile.providerIdentityId,
            customerId: contractFile.customerId,
        };
    }
}
