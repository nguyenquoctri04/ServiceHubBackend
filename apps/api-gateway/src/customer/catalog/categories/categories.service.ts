import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

export interface ServicePriceMapping {
    servicePriceId: string;
    serviceId: string;
    providerId: string;
}

export interface PopularServicePrice {
    servicePriceId: string;
    count: number;
}

export interface Category {
    id: string;
    name: string;
    totalService: number;
}

export interface PopularService {
    id: string;
    title: string;
    category: string;
    providerId: string;
    image: string;
    price: number;
    priceUnit: string;
    location: string;
}

export interface Provider {
    id: string;
    providerName: string;
}

@Injectable()
export class CustomerCategoriesService {
    constructor(
        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,

        @Inject("CONTRACT_SERVICE")
        private readonly contractClient: ClientProxy,

        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,
    ) {}

    async fetchHome() {
        /*
         * ============================================================
         * 1. Lấy categories và mapping ServicePrice cùng lúc
         * ============================================================
         *
         * Catalog Service chịu trách nhiệm:
         *
         * ServicePrice
         *      ↓
         * Service
         *      ↓
         * Provider
         *
         * Vì ContractService chỉ lưu servicePriceId nên Gateway
         * cần mapping servicePriceId -> serviceId/providerId.
         */
        const [categories, servicePriceMappings] = await Promise.all([
            firstValueFrom(
                this.catalogClient.send<Category[], Record<string, never>>(
                    {
                        cmd: CustomerPatterns.GET_HOME_CATEGORIES,
                    },
                    {},
                ),
            ),

            firstValueFrom(
                this.catalogClient.send<
                    ServicePriceMapping[],
                    Record<string, never>
                >(
                    {
                        cmd: CustomerPatterns.GET_SERVICE_PRICE_MAPPINGS,
                    },
                    {},
                ),
            ),
        ]);

        /*
         * Nếu Catalog chưa có ServicePrice nào thì không thể
         * tìm popular service.
         */
        if (!servicePriceMappings || servicePriceMappings.length === 0) {
            return {
                categories,
                popularServices: [],
            };
        }

        /*
         * ============================================================
         * 2. Lấy danh sách servicePriceId
         * ============================================================
         */
        const servicePriceIds = servicePriceMappings.map(
            (item) => item.servicePriceId,
        );

        /*
         * ============================================================
         * 3. Lấy các ServicePrice được sử dụng nhiều nhất
         * ============================================================
         *
         * Contract Service sẽ:
         *
         * - Chỉ lấy Contract ACTIVE / EXPIRED
         * - Đếm số ContractService
         * - Group theo servicePriceId
         * - Sắp xếp giảm dần
         *
         * Không lấy limit = 3 ngay ở đây vì sau đó còn phải
         * loại những service/provider bị restriction.
         */
        const popular = await firstValueFrom(
            this.contractClient.send<
                PopularServicePrice[],
                {
                    servicePriceIds: string[];
                    limit: number;
                }
            >(
                {
                    cmd: CustomerPatterns.GET_POPULAR_SERVICES,
                },
                {
                    servicePriceIds,
                    limit: 20,
                },
            ),
        );

        if (!popular || popular.length === 0) {
            return {
                categories,
                popularServices: [],
            };
        }

        /*
         * ============================================================
         * 4. Tạo map:
         *
         * servicePriceId
         *      ↓
         * {
         *    serviceId,
         *    providerId
         * }
         * ============================================================
         */
        const servicePriceMap = new Map<string, ServicePriceMapping>(
            servicePriceMappings.map((item) => [item.servicePriceId, item]),
        );

        /*
         * ============================================================
         * 5. Gom các ServicePrice về Service
         * ============================================================
         *
         * Một Service có thể có nhiều ServicePrice.
         *
         * Ví dụ:
         *
         * Service A
         * ├── Price A1 → 20 lượt
         * └── Price A2 → 10 lượt
         *
         * Popular của Service A phải là:
         *
         * 20 + 10 = 30 lượt
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
                categories,
                popularServices: [],
            };
        }

        /*
         * ============================================================
         * 7. Lấy serviceId
         * ============================================================
         *
         * Tạm thời lấy nhiều hơn 3 service vì sau này còn filter
         * service/provider bị restriction.
         */
        const serviceIds = sortedServices.map((item) => item.serviceId);

        /*
         * ============================================================
         * 8. Lấy thông tin Service từ Catalog Service
         * ============================================================
         */
        const services = await firstValueFrom(
            this.catalogClient.send<
                PopularService[],
                {
                    serviceIds: string[];
                }
            >(
                {
                    cmd: CustomerPatterns.GET_POPULAR_SERVICE_DETAIL,
                },
                {
                    serviceIds,
                },
            ),
        );

        if (!services || services.length === 0) {
            return {
                categories,
                popularServices: [],
            };
        }

        /*
         * ============================================================
         * 9. Lấy Provider IDs
         * ============================================================
         */
        const providerIds = [
            ...new Set(services.map((service) => service.providerId)),
        ];

        /*
         * ============================================================
         * 10. Lấy thông tin Provider từ Identity Service
         * ============================================================
         */
        const providers =
            providerIds.length > 0
                ? await firstValueFrom(
                      this.identityClient.send<
                          Provider[],
                          {
                              providerIds: string[];
                          }
                      >(
                          {
                              cmd: CustomerPatterns.GET_PROVIDER_IN_POPULAR,
                          },
                          {
                              providerIds,
                          },
                      ),
                  )
                : [];

        /*
         * ============================================================
         * 11. Tạo Map Service
         * ============================================================
         */
        const serviceMap = new Map(
            services.map((service) => [service.id, service]),
        );

        /*
         * ============================================================
         * 12. Tạo Map Provider
         * ============================================================
         */
        const providerMap = new Map(
            providers.map((provider) => [provider.id, provider]),
        );

        /*
         * ============================================================
         * 13. Ghép dữ liệu
         * ============================================================
         *
         * Giữ nguyên thứ tự popular đã được tính ở trên.
         */
        const popularServices = sortedServices
            .map((item) => {
                const service = serviceMap.get(item.serviceId);

                if (!service) {
                    return null;
                }

                const provider = providerMap.get(service.providerId);

                return {
                    id: service.id,

                    title: service.title,

                    category: service.category,

                    provider: provider?.providerName ?? "",

                    image: service.image,

                    price: service.price,

                    priceUnit: service.priceUnit,

                    location: service.location,
                };
            })
            .filter(
                (service): service is NonNullable<typeof service> =>
                    service !== null,
            )
            .slice(0, 3);

        /*
         * ============================================================
         * 14. Trả kết quả
         * ============================================================
         */
        return {
            categories,
            popularServices,
        };
    }
}
