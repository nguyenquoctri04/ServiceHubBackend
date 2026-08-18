import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface PopularServiceInput {
    serviceId: string;
    providerId: string;
}

@Injectable()
export class CustomerContractsService {
    constructor(private readonly prisma: PrismaService) {}

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
}
