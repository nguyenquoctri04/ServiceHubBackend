import { Prisma } from "@prisma/client-catalog";
import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
    MarketplaceServiceDto,
    MarketplaceServicesQueryDto,
    MarketplaceServicesResponseDto,
    MarketplaceSortBy,
    ServiceDetailData,
    ServiceDetailProvider,
} from "@app/common/dto/customer/catalog";
import { Provider } from "../categories/types/customer.categories.type";
import { ClientProxy } from "@nestjs/microservices";
import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CustomerServicesService {
    constructor(
        private readonly prisma: PrismaService,

        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,

        @Inject("CONTRACT_SERVICE")
        private readonly contractClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,

        private readonly configService: ConfigService,
    ) {}

    async getActiveServicesForPopular() {
        return this.prisma.service.findMany({
            where: {
                status: "ACTIVE",
            },

            select: {
                id: true,
                providerId: true,
            },
        });
    }

    async getPopularServicesByIds(serviceIds: string[]) {
        if (serviceIds.length === 0) {
            return [];
        }

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

        return services.map((service) => ({
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
        }));
    }

    async getServicePriceMappings() {
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

        return prices.map((price) => ({
            servicePriceId: price.id,
            serviceId: price.serviceId,
            providerId: price.service.providerId,
        }));
    }

    async getMarketplaceServices(param: {
        query: MarketplaceServicesQueryDto;
        customerId: string | null;
    }): Promise<MarketplaceServicesResponseDto> {
        const {
            categoryId,
            search,
            page = 1,
            pageSize = 5,
            longitude,
            latitude,
            sortBy = MarketplaceSortBy.NEAREST,
        } = param.query;

        const skip = (page - 1) * pageSize;

        const isNearest =
            sortBy === MarketplaceSortBy.NEAREST &&
            latitude != null &&
            longitude != null;

        const baseWhere: Prisma.ServiceWhereInput = {
            status: "ACTIVE",

            ...(categoryId &&
                categoryId !== "all" && {
                    categoryId,
                }),

            ...(search?.trim() && {
                OR: [
                    {
                        name: {
                            contains: search.trim(),
                            mode: "insensitive",
                        },
                    },
                    {
                        description: {
                            contains: search.trim(),
                            mode: "insensitive",
                        },
                    },
                ],
            }),
        };

        /**
         * Chỉ lấy service thỏa mãn toàn bộ điều kiện:
         *
         * 1. Service ACTIVE
         * 2. Provider ACTIVE
         * 3. Identity của provider ACTIVE
         * 4. Nếu user đăng nhập:
         *    - không bị PLATFORM restriction
         *    - không bị PROVIDER restriction
         *    - không bị SERVICE restriction
         */
        const eligibleServiceIds = await this.getEligibleServiceIds(
            baseWhere,
            param.customerId,
        );

        if (eligibleServiceIds.length === 0) {
            return {
                services: [],
                pagination: {
                    page,
                    pageSize,
                    total: 0,
                    totalPages: 0,
                },
            };
        }

        /**
         * Đây là danh sách service hợp lệ cuối cùng.
         *
         * Quan trọng:
         * Filter eligibility được áp dụng TRƯỚC pagination.
         */
        const where: Prisma.ServiceWhereInput = {
            ...baseWhere,
            id: {
                in: eligibleServiceIds,
            },
        };

        let services: any[];
        let total: number;

        if (isNearest) {
            /**
             * eligibleServiceIds đã là toàn bộ service hợp lệ,
             * nên total phải tính trên chính danh sách này.
             */
            total = eligibleServiceIds.length;

            services = await this.findNearestServices(
                {
                    serviceIds: eligibleServiceIds,
                },
                {
                    lat: latitude!,
                    lng: longitude!,
                },
                skip,
                pageSize,
            );
        } else {
            [total, services] = await this.prisma.$transaction([
                this.prisma.service.count({
                    where,
                }),

                this.prisma.service.findMany({
                    where,
                    skip,
                    take: pageSize,
                    orderBy: {
                        createdAt: "desc",
                    },
                    include: {
                        category: {
                            select: {
                                name: true,
                            },
                        },
                        images: {
                            take: 1,
                            orderBy: {
                                displayOrder: "asc",
                            },
                            select: {
                                imageUrl: true,
                            },
                        },
                        prices: {
                            take: 1,
                            orderBy: {
                                price: "asc",
                            },
                            select: {
                                price: true,
                            },
                        },
                    },
                }),
            ]);
        }

        const totalPages = Math.ceil(total / pageSize);

        /**
         * Enrich provider information.
         * Đây KHÔNG phải bước kiểm tra eligibility nữa.
         */
        const providerIds = [
            ...new Set(services.map((service) => service.providerId)),
        ];

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

        const providerMap = new Map(
            providers.map((provider) => [provider.id, provider]),
        );

        const mapped = services.map((item) =>
            isNearest
                ? {
                      id: item.id,
                      title: item.name,
                      description: item.description,
                      category: item.categoryName,
                      image: item.image ?? null,
                      price: Number(item.price ?? 0),
                      address: item.address,
                      distance: Number(item.distanceKm.toFixed(2)),
                      provider: providerMap.get(item.providerId),
                  }
                : {
                      id: item.id,
                      title: item.name,
                      description: item.description,
                      category: item.category.name,
                      image: item.images[0]?.imageUrl ?? null,
                      price: Number(item.prices[0]?.price ?? 0),
                      address: item.address,
                      distance: null,
                      provider: providerMap.get(item.providerId),
                  },
        );

        return {
            services: mapped,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
            },
        };
    }

    private async getEligibleServiceIds(
        where: Prisma.ServiceWhereInput,
        customerId: string | null,
    ): Promise<string[]> {
        /**
         * Bước 1:
         * Lấy toàn bộ service candidate theo các filter của marketplace.
         *
         * Lúc này mới chỉ kiểm tra:
         * - Service ACTIVE
         * - category
         * - search
         */
        const candidates = await this.prisma.service.findMany({
            where,
            select: {
                id: true,
                providerId: true,
            },
        });

        if (candidates.length === 0) {
            return [];
        }

        /**
         * Bước 2:
         * Lấy provider IDs duy nhất.
         */
        const providerIds = [
            ...new Set(candidates.map((service) => service.providerId)),
        ];

        /**
         * Bước 3:
         * Identity-service kiểm tra:
         *
         * Provider.status = ACTIVE
         * Identity.status = ACTIVE
         */
        const activeProviders = await this.secureRpc.send<Provider[]>(
            this.identityClient,
            {
                cmd: CustomerPatterns.GET_PROVIDER_IN_POPULAR,
            },
            {
                providerIds,
            },
        );

        const activeProviderIds = new Set(
            activeProviders.map((provider) => provider.id),
        );

        /**
         * Chỉ giữ service thuộc provider hợp lệ.
         */
        let eligible = candidates.filter((service) =>
            activeProviderIds.has(service.providerId),
        );

        if (eligible.length === 0) {
            return [];
        }

        /**
         * Bước 4:
         * Nếu chưa đăng nhập thì đến đây là đủ.
         *
         * Service:
         * ACTIVE
         *
         * Provider:
         * ACTIVE
         *
         * Identity:
         * ACTIVE
         */
        if (!customerId) {
            return eligible.map((service) => service.id);
        }

        /**
         * Bước 5:
         * User đã đăng nhập → kiểm tra restriction.
         */
        const serviceIds = eligible.map((service) => service.id);

        const eligibleProviderIds = [
            ...new Set(eligible.map((service) => service.providerId)),
        ];

        const restrictions = await this.secureRpc.send<{
            platformBlocked: boolean;
            blockedProviderIds: string[];
            blockedServiceIds: string[];
        }>(
            this.contractClient,
            {
                cmd: CustomerPatterns.GET_MARKETPLACE_RESTRICTIONS,
            },
            {
                customerId,
                serviceIds,
                providerIds: eligibleProviderIds,
            },
        );

        /**
         * User bị PLATFORM restriction:
         * Không được hiển thị bất kỳ service nào.
         */
        if (restrictions.platformBlocked) {
            return [];
        }

        const blockedProviderIds = new Set(restrictions.blockedProviderIds);

        const blockedServiceIds = new Set(restrictions.blockedServiceIds);

        /**
         * Loại:
         *
         * 1. Provider bị cấm đối với user
         * 2. Service bị cấm đối với user
         */
        eligible = eligible.filter(
            (service) =>
                !blockedProviderIds.has(service.providerId) &&
                !blockedServiceIds.has(service.id),
        );

        return eligible.map((service) => service.id);
    }

    private async findNearestServices(
        where: {
            serviceIds: string[];
        },
        origin: {
            lat: number;
            lng: number;
        },
        skip: number,
        take: number,
    ) {
        if (where.serviceIds.length === 0) {
            return [];
        }

        /**
         * Chuyển danh sách UUID thành SQL parameter an toàn.
         *
         * Prisma.join() sẽ tạo:
         *
         * s.id IN ($1, $2, $3, ...)
         */
        const serviceIdCondition = Prisma.sql`
        s.id IN (
            ${Prisma.join(
                where.serviceIds.map(
                    (serviceId) => Prisma.sql`${serviceId}::uuid`,
                ),
            )}
        )
    `;

        /**
         * Điểm gốc là vị trí hiện tại của user.
         */
        const originGeo = Prisma.sql`
        geography(
            ST_MakePoint(
                ${origin.lng}::float8,
                ${origin.lat}::float8
            )
        )
    `;

        const rows = await this.prisma.$queryRaw<
            Array<{
                id: string;
                name: string;
                description: string | null;
                address: string | null;
                providerId: string;
                categoryName: string;
                image: string | null;
                price: Prisma.Decimal | null;
                distanceKm: number;
            }>
        >`
        SELECT
            s.id,
            s.name,
            s.description,
            s.address,
            s.provider_id AS "providerId",
            c.name AS "categoryName",

            (
                SELECT si.image_url
                FROM service_image si
                WHERE si.service_id = s.id
                ORDER BY si.display_order ASC
                LIMIT 1
            ) AS "image",

            (
                SELECT sp.price
                FROM service_price sp
                WHERE sp.service_id = s.id
                ORDER BY sp.price ASC
                LIMIT 1
            ) AS "price",

            ST_Distance(
                geography(
                    ST_MakePoint(
                        s.longtitude::float8,
                        s.latitude::float8
                    )
                ),
                ${originGeo}
            ) / 1000.0 AS "distanceKm"

        FROM service s

        JOIN category c
            ON c.id = s.category_id

        WHERE
            ${serviceIdCondition}

        ORDER BY
            geography(
                ST_MakePoint(
                    s.longtitude::float8,
                    s.latitude::float8
                )
            ) <-> ${originGeo}

        LIMIT ${take}
        OFFSET ${skip}
    `;

        return rows;
    }

    async getDetail(
        serviceId: string,
        customerId: string | null,
    ): Promise<ServiceDetailData | null> {
        const now = new Date();

        const service = await this.prisma.service.findFirst({
            where: { id: serviceId, status: "ACTIVE" },
            include: {
                category: true,
                images: { orderBy: { displayOrder: "asc" } },
                prices: {
                    where: {
                        effectiveFrom: { lte: now },
                        OR: [
                            { effectiveTo: null },
                            { effectiveTo: { gte: now } },
                        ],
                    },
                    orderBy: { effectiveFrom: "desc" },
                },
                requirements: {
                    where: { status: "ACTIVE" },
                    include: {
                        additionalService: {
                            include: {
                                prices: {
                                    where: {
                                        effectiveFrom: { lte: now },
                                        OR: [
                                            { effectiveTo: null },
                                            { effectiveTo: { gte: now } },
                                        ],
                                    },
                                    orderBy: { effectiveFrom: "desc" },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!service) return null;

        // (2) Nhà cung cấp phải ACTIVE — tái dùng RPC đã lọc sẵn status=ACTIVE.
        const activeProviders = await this.secureRpc.send<Provider[]>(
            this.identityClient,
            { cmd: CustomerPatterns.GET_PROVIDER_IN_POPULAR },
            { providerIds: [service.providerId] },
        );
        if (activeProviders.length === 0) return null;

        // (3) Đã đăng nhập -> kiểm tra service/provider có bị cấm với
        // khách này không (Restriction bên contract-service).
        if (customerId) {
            const { blocked } = await this.secureRpc.send<{ blocked: boolean }>(
                this.contractClient,
                { cmd: CustomerPatterns.CHECK_SERVICE_ACCESS },
                {
                    serviceId: service.id,
                    providerId: service.providerId,
                    customerId,
                },
            );
            if (blocked) return null;
        }

        const provider = await this.fetchProvider(service.providerId);

        return {
            id: service.id,
            name: service.name,
            description: service.description,
            address: service.address,
            image: service.images[0]?.imageUrl ?? null,
            images: service.images.map((img) => img.imageUrl),
            distanceKm: null,
            category: { id: service.category.id, name: service.category.name },
            provider,
            prices: service.prices.map((p) => ({
                id: p.id,
                price: Number(p.price),
                unit: p.unit,
            })),
            requiredServices: service.requirements.map((req) => ({
                id: req.additionalService.id,
                name: req.additionalService.name,
                description: req.additionalService.description,
                price:
                    req.additionalService.prices[0]?.price != null
                        ? Number(req.additionalService.prices[0].price)
                        : null,
                unit: req.additionalService.prices[0]?.unit ?? null,
            })),
        };
    }

    async getRelated(
        serviceId: string,
        customerId: string | null,
        latitude?: number,
        longitude?: number,
    ): Promise<MarketplaceServiceDto[]> {
        const current = await this.prisma.service.findFirst({
            where: {
                id: serviceId,
                status: "ACTIVE",
            },
            select: {
                id: true,
                categoryId: true,
            },
        });

        if (!current) {
            return [];
        }

        /**
         * Lấy các service cùng category, sau đó áp dụng toàn bộ
         * điều kiện visibility:
         *
         * 1. Service ACTIVE
         * 2. Provider ACTIVE
         * 3. Identity của provider ACTIVE
         * 4. Nếu user login:
         *    - không bị PLATFORM restriction
         *    - không bị PROVIDER restriction
         *    - không bị SERVICE restriction
         */
        const eligibleServiceIds = await this.getEligibleServiceIds(
            {
                status: "ACTIVE",
                categoryId: current.categoryId,
                id: {
                    not: serviceId,
                },
            },
            customerId,
        );

        if (eligibleServiceIds.length === 0) {
            return [];
        }

        const hasLocation = latitude != null && longitude != null;

        const candidates = hasLocation
            ? await this.findRelatedWithDistance(
                  serviceId,
                  current.categoryId,
                  eligibleServiceIds,
                  latitude!,
                  longitude!,
              )
            : await this.findRelatedWithoutDistance(
                  serviceId,
                  current.categoryId,
                  eligibleServiceIds,
              );

        if (candidates.length === 0) {
            return [];
        }

        return this.enrichRelatedRows(candidates);
    }

    private async findRelatedWithoutDistance(
        serviceId: string,
        categoryId: string,
        eligibleServiceIds: string[],
    ): Promise<Array<{ id: string; distanceKm?: number }>> {
        if (eligibleServiceIds.length === 0) {
            return [];
        }

        /**
         * eligibleServiceIds đã được filter:
         * - Service ACTIVE
         * - Provider ACTIVE
         * - Identity ACTIVE
         * - restriction
         *
         * Vì vậy query này chỉ còn nhiệm vụ random 3 service.
         */
        const where = {
            status: "ACTIVE" as const,
            categoryId,
            id: {
                in: eligibleServiceIds,
                not: serviceId,
            },
        };

        const total = await this.prisma.service.count({
            where,
        });

        if (total === 0) {
            return [];
        }

        const take = Math.min(3, total);
        const offset = Math.floor(Math.random() * (total - take + 1));

        return this.prisma.service.findMany({
            where,
            skip: offset,
            take,
            orderBy: {
                id: "asc",
            },
            select: {
                id: true,
            },
        });
    }

    private async findRelatedWithDistance(
        serviceId: string,
        categoryId: string,
        eligibleServiceIds: string[],
        lat: number,
        lng: number,
    ): Promise<Array<{ id: string; distanceKm: number }>> {
        if (eligibleServiceIds.length === 0) {
            return [];
        }

        /**
         * Điểm gốc của user.
         *
         * PostGIS:
         * ST_MakePoint(longitude, latitude)
         */
        const originGeo = Prisma.sql`
        geography(
            ST_MakePoint(
                ${lng}::float8,
                ${lat}::float8
            )
        )
    `;

        /**
         * Khoảng cách tính theo km.
         */
        const distanceExpr = Prisma.sql`
        ST_Distance(
            geography(
                ST_MakePoint(
                    s.longtitude::float8,
                    s.latitude::float8
                )
            ),
            ${originGeo}
        ) / 1000.0
    `;

        /**
         * Chỉ query các service đã được eligibility filter.
         *
         * Điều kiện 10km được áp dụng thêm ở đây.
         */
        const serviceIdsCondition = Prisma.sql`
        s.id IN (
            ${Prisma.join(
                eligibleServiceIds.map((id) => Prisma.sql`${id}::uuid`),
            )}
        )
    `;

        const whereClause = Prisma.sql`
        s.status = 'ACTIVE'
        AND s.category_id = ${categoryId}::uuid
        AND s.id != ${serviceId}::uuid
        AND ${serviceIdsCondition}
        AND ${distanceExpr} <= 20
    `;

        /**
         * Đếm sau khi đã áp dụng:
         * - eligibility
         * - cùng category
         * - bỏ service hiện tại
         * - trong bán kính 10km
         */
        const countRows = await this.prisma.$queryRaw<Array<{ total: bigint }>>`
            SELECT COUNT(*)::bigint AS total
            FROM service s
            WHERE ${whereClause}
        `;

        const total = Number(countRows[0]?.total ?? 0);

        if (total === 0) {
            return [];
        }

        const take = Math.min(3, total);

        const offset = Math.floor(Math.random() * (total - take + 1));

        const rows = await this.prisma.$queryRaw<
            Array<{
                id: string;
                distanceKm: number;
            }>
        >`
            SELECT
                s.id,
                ${distanceExpr} AS "distanceKm"

            FROM service s

            WHERE ${whereClause}

            ORDER BY s.id

            OFFSET ${offset}
            LIMIT ${take}
        `;

        return rows;
    }

    private async enrichRelatedRows(
        rows: Array<{
            id: string;
            distanceKm?: number;
        }>,
    ): Promise<MarketplaceServiceDto[]> {
        const ids = rows.map((row) => row.id);

        if (ids.length === 0) {
            return [];
        }

        const distanceById = new Map(
            rows.map((row) => [row.id, row.distanceKm ?? null]),
        );

        const now = new Date();

        /**
         * Chỉ load đúng 3 service đã random ở bước trước.
         */
        const services = await this.prisma.service.findMany({
            where: {
                id: {
                    in: ids,
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
                },
            },
        });

        if (services.length === 0) {
            return [];
        }

        /**
         * Enrich provider information.
         *
         * Không dùng RPC này để quyết định eligibility nữa.
         * Eligibility đã được xử lý bởi getEligibleServiceIds().
         */
        const providerIds = [
            ...new Set(services.map((service) => service.providerId)),
        ];

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

        const providerMap = new Map(
            providers.map((provider) => [provider.id, provider]),
        );

        const serviceById = new Map(
            services.map((service) => [service.id, service]),
        );

        /**
         * Prisma findMany({ id: { in: ids } }) không đảm bảo
         * thứ tự giống ids.
         *
         * Vì vậy phải map lại theo ids ban đầu để giữ thứ tự random.
         */
        return ids
            .map((id) => serviceById.get(id))
            .filter(
                (service): service is NonNullable<typeof service> => !!service,
            )
            .map((service) => {
                const provider = providerMap.get(service.providerId);

                /**
                 * Service hợp lệ phải có provider hợp lệ.
                 *
                 * Về lý thuyết provider luôn tồn tại vì đã được
                 * getEligibleServiceIds() kiểm tra.
                 *
                 * Nhưng check thêm ở đây giúp tránh trả dữ liệu
                 * không đầy đủ nếu RPC/provider có vấn đề.
                 */
                if (!provider) {
                    return null;
                }

                const lowestPrice =
                    service.prices.length > 0
                        ? service.prices.reduce((lowest, current) =>
                              current.price.comparedTo(lowest.price) < 0
                                  ? current
                                  : lowest,
                          )
                        : null;

                return {
                    id: service.id,
                    title: service.name,
                    description: service.description,
                    category: service.category.name,
                    image: service.images[0]?.imageUrl ?? null,
                    price: Number(lowestPrice?.price ?? 0),
                    address: service.address,
                    distance: distanceById.get(service.id) ?? null,
                    provider,
                };
            })
            .filter(
                (service): service is NonNullable<typeof service> => !!service,
            );
    }

    private async fetchProvider(providerId: string) {
        const providers = await this.secureRpc.send<ServiceDetailProvider[]>(
            this.identityClient,
            { cmd: CustomerPatterns.GET_PROVIDER_SUMMARY },
            { providerIds: [providerId] },
        );

        const provider = providers[0];

        return (
            provider ?? {
                id: providerId,
                providerName: "",
                logoUrl: null,
                description: null,
                businessType: "INDIVIDUAL",
                companyName: null,
                address: null,
                website: null,
            }
        );
    }

    async getProviderServicesAndProperties(
        providerId: string,
        customerId?: string,
    ) {
        const MAX_FEATURED = 4;
        const now = new Date();

        // "stats tính toàn bộ" -> không lọc gì, độc lập với danh sách trả về.
        const [serviceCount, propertyCount] = await Promise.all([
            this.prisma.service.count({ where: { providerId } }),
            this.prisma.property.count({ where: { providerId } }),
        ]);

        const services = await this.prisma.service.findMany({
            where: { providerId, status: "ACTIVE" },
            include: {
                category: { select: { name: true } },
                images: { orderBy: { displayOrder: "asc" }, take: 1 },
                prices: {
                    where: {
                        effectiveFrom: { lte: now },
                        OR: [
                            { effectiveTo: null },
                            { effectiveTo: { gte: now } },
                        ],
                    },
                    orderBy: { price: "asc" },
                },
            },
        });

        const properties = await this.prisma.property.findMany({
            where: { providerId, status: "ACTIVE" },
            include: {
                roomTypes: { select: { _count: { select: { rooms: true } } } },
            },
        });

        const { usageCounts, blockedServiceIds } =
            services.length > 0
                ? await this.secureRpc.send<{
                      usageCounts: Array<{ serviceId: string; count: number }>;
                      blockedServiceIds: string[];
                  }>(
                      this.contractClient,
                      { cmd: CustomerPatterns.GET_PROVIDER_SERVICE_INSIGHTS },
                      {
                          items: services.map((s) => ({
                              serviceId: s.id,
                              servicePriceIds: s.prices.map((p) => p.id),
                          })),
                          customerId,
                      },
                  )
                : { usageCounts: [], blockedServiceIds: [] as string[] };

        const blockedSet = new Set(blockedServiceIds);

        const featuredServiceIds = new Set(
            usageCounts
                .filter((c) => c.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, MAX_FEATURED)
                .map((c) => c.serviceId),
        );

        return {
            serviceCount,
            propertyCount,
            services: services
                // Loại dịch vụ đang bị Restriction (scopeType=SERVICE) với
                // đúng customer này.
                .filter((s) => !blockedSet.has(s.id))
                .map((s) => ({
                    id: s.id,
                    name: s.name,
                    description: s.description ?? undefined,
                    categoryName: s.category.name,
                    address: s.address,
                    imageUrl: s.images[0]?.imageUrl ?? undefined,
                    price: s.prices[0]?.price ? Number(s.prices[0].price) : 0,
                    unit: s.prices[0]?.unit ?? "",
                    serviceType: s.serviceType,
                    isFeature: featuredServiceIds.has(s.id),
                    status: "ACTIVE" as const,
                })),
            properties: properties.map((p) => ({
                id: p.id,
                propertyName: p.propertyName,
                description: p.description ?? undefined,
                address: p.address,
                roomTypeCount: p.roomTypes.length,
                roomCount: p.roomTypes.reduce(
                    (sum, rt) => sum + rt._count.rooms,
                    0,
                ),
                status: "ACTIVE" as const,
            })),
        };
    }

    async validateServicePrice(servicePriceId: string) {
        const now = new Date();

        const servicePrice = await this.prisma.servicePrice.findFirst({
            where: {
                id: servicePriceId,
                effectiveFrom: { lte: now },
                OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
                service: { status: "ACTIVE" },
            },
            select: {
                id: true,
                price: true,
                unit: true,
                service: {
                    select: { id: true, name: true, providerId: true },
                },
            },
        });

        if (!servicePrice) return null;

        return {
            servicePriceId: servicePrice.id,
            serviceId: servicePrice.service.id,
            serviceName: servicePrice.service.name,
            providerId: servicePrice.service.providerId,
            price: Number(servicePrice.price),
            unit: servicePrice.unit,
        };
    }
}
