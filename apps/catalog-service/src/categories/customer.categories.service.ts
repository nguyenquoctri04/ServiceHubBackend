import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { SecureRpcService } from "@app/common";

import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { PrismaService } from "../prisma/prisma.service";
import {
    Category,
    PopularService,
    PopularServicePrice,
    Provider,
    ServicePriceMapping,
} from "./types/customer.categories.type";

@Injectable()
export class CustomerCategoriesService {
    constructor(
        private readonly prisma: PrismaService,

        @Inject("CONTRACT_SERVICE")
        private readonly contractClient: ClientProxy,

        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async getHomeCategories() {
        /*
         * ============================================================
         * 1. Lấy tất cả Category
         * ============================================================
         */

        const categories = await this.prisma.category.findMany({
            orderBy: {
                name: "asc",
            },
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        services: {
                            where: {
                                status: "ACTIVE",
                            },
                        },
                    },
                },
            },
        });

        const categoryResult: Category[] = categories.map((category) => ({
            id: category.id,
            name: category.name,
            totalService: category._count.services,
        }));

        /*
         * ============================================================
         * 2. Lấy ServicePrice mapping
         *
         * ServicePrice
         *      ↓
         * Service
         *      ↓
         * Provider
         *
         * Catalog Service tự lấy dữ liệu này từ DB của mình.
         * ============================================================
         */

        const prices = await this.prisma.servicePrice.findMany({
            where: {
                service: {
                    status: "ACTIVE",
                },
            },
            select: {
                id: true,
                serviceId: true,
                service: {
                    select: {
                        providerId: true,
                    },
                },
            },
        });

        const servicePriceMappings: ServicePriceMapping[] = prices.map(
            (price) => ({
                servicePriceId: price.id,
                serviceId: price.serviceId,
                providerId: price.service.providerId,
            }),
        );

        /*
         * Không có ServicePrice => không thể tìm popular service.
         */

        if (servicePriceMappings.length === 0) {
            return {
                categories: categoryResult,
                popularServices: [],
            };
        }

        /*
         * ============================================================
         * 3. Lấy danh sách ServicePrice được sử dụng nhiều nhất
         *
         * Catalog Service gọi THẲNG Contract Service.
         *
         * Gateway không tham gia bước này nữa.
         * ============================================================
         */

        const servicePriceIds = servicePriceMappings.map(
            (item) => item.servicePriceId,
        );

        const popular = await this.secureRpc.send<PopularServicePrice[]>(
            this.contractClient,
            {
                cmd: CustomerPatterns.GET_POPULAR_SERVICES,
            },
            {
                servicePriceIds,
                limit: 20,
            },
        );

        if (!popular || popular.length === 0) {
            return {
                categories: categoryResult,
                popularServices: [],
            };
        }

        /*
         * ============================================================
         * 4. Mapping:
         *
         * servicePriceId
         *      ↓
         * serviceId
         *      ↓
         * providerId
         * ============================================================
         */

        const servicePriceMap = new Map<string, ServicePriceMapping>(
            servicePriceMappings.map((item) => [item.servicePriceId, item]),
        );

        /*
         * ============================================================
         * 5. Gom nhiều ServicePrice về cùng một Service
         *
         * Ví dụ:
         *
         * Service A
         * ├── Price A1 → 20
         * └── Price A2 → 10
         *
         * Service A = 30
         * ============================================================
         */

        const serviceCountMap = new Map<
            string,
            {
                serviceId: string;
                providerId: string;
                count: number;
            }
        >();

        for (const item of popular) {
            const mapping = servicePriceMap.get(item.servicePriceId);

            if (!mapping) {
                continue;
            }

            const current = serviceCountMap.get(mapping.serviceId);

            if (current) {
                current.count += item.count;
            } else {
                serviceCountMap.set(mapping.serviceId, {
                    serviceId: mapping.serviceId,
                    providerId: mapping.providerId,
                    count: item.count,
                });
            }
        }

        /*
         * ============================================================
         * 6. Sắp xếp Service theo số lượt sử dụng
         * ============================================================
         */

        const sortedServices = Array.from(serviceCountMap.values()).sort(
            (a, b) => b.count - a.count,
        );

        if (sortedServices.length === 0) {
            return {
                categories: categoryResult,
                popularServices: [],
            };
        }

        /*
         * ============================================================
         * 7. Lấy Service detail trực tiếp từ Catalog DB
         *
         * Không cần gọi RPC vì Catalog Service đang sở hữu dữ liệu
         * Service.
         * ============================================================
         */

        const serviceIds = sortedServices.map((item) => item.serviceId);

        const now = new Date();

        const services = await this.prisma.service.findMany({
            where: {
                id: {
                    in: serviceIds,
                },
                status: "ACTIVE",
            },

            include: {
                category: true,

                images: {
                    orderBy: {
                        displayOrder: "asc",
                    },
                    take: 1,
                },

                prices: {
                    where: {
                        effectiveFrom: {
                            lte: now,
                        },
                        OR: [
                            {
                                effectiveTo: null,
                            },
                            {
                                effectiveTo: {
                                    gte: now,
                                },
                            },
                        ],
                    },

                    orderBy: {
                        effectiveFrom: "desc",
                    },

                    take: 1,
                },
            },
        });

        if (services.length === 0) {
            return {
                categories: categoryResult,
                popularServices: [],
            };
        }

        /*
         * ============================================================
         * 8. Lấy Provider IDs
         * ============================================================
         */

        const providerIds = [
            ...new Set(services.map((service) => service.providerId)),
        ];

        /*
         * ============================================================
         * 9. Catalog Service gọi THẲNG Identity Service
         *
         * Gateway không còn gọi Identity Service.
         * ============================================================
         */

        const providers =
            providerIds.length > 0
                ? await this.secureRpc.send<Provider[]>(
                      this.identityClient,
                      {
                          cmd: CustomerPatterns.GET_PROVIDER_IN_POPULAR,
                      },
                      {
                          providerIds,
                      },
                  )
                : [];

        /*
         * ============================================================
         * 10. Tạo Map Service
         * ============================================================
         */

        const serviceMap = new Map(
            services.map((service) => [
                service.id,
                {
                    id: service.id,
                    providerId: service.providerId,
                    title: service.name,
                    category: service.category.name,
                    image: service.images[0]?.imageUrl ?? "",
                    price: service.prices[0]?.price
                        ? Number(service.prices[0].price)
                        : 0,
                    priceUnit: service.prices[0]?.unit ?? "",
                    location: service.address,
                },
            ]),
        );

        /*
         * ============================================================
         * 11. Tạo Map Provider
         * ============================================================
         */

        const providerMap = new Map(
            providers.map((provider) => [provider.id, provider]),
        );

        /*
         * ============================================================
         * 12. Ghép dữ liệu
         *
         * Giữ nguyên thứ tự popular.
         *
         * Cuối cùng chỉ lấy 3 Service.
         * ============================================================
         */

        const popularServices: Array<
            PopularService & {
                provider: string;
            }
        > = sortedServices
            .map((item) => {
                const service = serviceMap.get(item.serviceId);

                if (!service) {
                    return null;
                }

                const provider = providerMap.get(service.providerId);

                return {
                    ...service,
                    provider: provider?.providerName ?? "",
                };
            })
            .filter(
                (
                    service,
                ): service is PopularService & {
                    provider: string;
                } => service !== null,
            )
            .slice(0, 3);

        /*
         * ============================================================
         * 13. Trả kết quả
         * ============================================================
         */

        return {
            categories: categoryResult,
            popularServices,
        };
    }
}
