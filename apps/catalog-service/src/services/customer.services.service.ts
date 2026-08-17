import { Prisma } from "@prisma/client-catalog";
import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
    MarketplaceServicesQueryDto,
    MarketplaceServicesResponseDto,
    MarketplaceSortBy,
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

    async getMarketplaceServices(
        query: MarketplaceServicesQueryDto,
    ): Promise<MarketplaceServicesResponseDto> {
        const {
            categoryId,
            search,
            page = 1,
            pageSize = 5,
            longitude,
            latitude,
            sortBy = MarketplaceSortBy.NEWEST,
        } = query;

        const skip = (page - 1) * pageSize;
        const isNearest =
            sortBy === MarketplaceSortBy.NEAREST &&
            latitude != null &&
            longitude != null;

        let services: any[];
        let total: number;

        const countWhere: Prisma.ServiceWhereInput = {
            status: "ACTIVE",
            ...(categoryId && categoryId !== "all" && { categoryId }),
            ...(search?.trim() && {
                OR: [
                    { name: { contains: search.trim(), mode: "insensitive" } },
                    {
                        description: {
                            contains: search.trim(),
                            mode: "insensitive",
                        },
                    },
                ],
            }),
        };

        if (isNearest) {
            // Count vẫn dùng Prisma bình thường (không cần geo, filter giống nhau).
            [total, services] = await Promise.all([
                this.prisma.service.count({ where: countWhere }),
                this.findNearestServices(
                    {
                        categoryId:
                            categoryId !== "all" ? categoryId : undefined,
                        search,
                    },
                    { lat: latitude!, lng: longitude! },
                    skip,
                    pageSize,
                ),
            ]);
        } else {
            // Nhánh NEWEST giữ nguyên như code cũ của bạn — không đổi gì.
            [total, services] = await this.prisma.$transaction([
                this.prisma.service.count({ where: countWhere }),
                this.prisma.service.findMany({
                    where: countWhere,
                    skip,
                    take: pageSize,
                    orderBy: { createdAt: "desc" },
                    include: {
                        category: { select: { name: true } },
                        images: {
                            take: 1,
                            orderBy: { displayOrder: "asc" },
                            select: { imageUrl: true },
                        },
                        prices: {
                            take: 1,
                            orderBy: { price: "asc" },
                            select: { price: true },
                        },
                    },
                }),
            ]);
        }

        const totalPages = Math.ceil(total / pageSize);

        const providerIds = [...new Set(services.map((s) => s.providerId))];

        const providers =
            providerIds.length > 0
                ? await this.secureRpc.send<Provider[]>(
                      this.identityClient,
                      { cmd: CustomerPatterns.GET_PROVIDER_IN_POPULAR },
                      { providerIds },
                  )
                : [];

        const providerMap = new Map(providers.map((p) => [p.id, p]));

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
            pagination: { page, pageSize, total, totalPages },
        };
    }

    private async findNearestServices(
        where: {
            categoryId?: string;
            search?: string;
        },
        origin: { lat: number; lng: number },
        skip: number,
        take: number,
    ) {
        const conditions: Prisma.Sql[] = [Prisma.sql`s.status = 'ACTIVE'`];

        if (where.categoryId) {
            conditions.push(
                Prisma.sql`s.category_id = ${where.categoryId}::uuid`,
            );
        }

        if (where.search?.trim()) {
            const term = `%${where.search.trim()}%`;
            conditions.push(
                Prisma.sql`(s.name ILIKE ${term} OR s.description ILIKE ${term})`,
            );
        }

        const whereClause = Prisma.join(conditions, " AND ");

        // Điểm gốc là user, tính geography 1 lần rồi tái sử dụng trong cả
        // ORDER BY lẫn SELECT (tránh tính lại 2 lần).
        const originGeo = Prisma.sql`geography(ST_MakePoint(${origin.lng}::float8, ${origin.lat}::float8))`;

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
                SELECT si.image_url FROM service_image si
                WHERE si.service_id = s.id
                ORDER BY si.display_order ASC
                LIMIT 1
            ) AS "image",
            (
                SELECT sp.price FROM service_price sp
                WHERE sp.service_id = s.id
                ORDER BY sp.price ASC
                LIMIT 1
            ) AS "price",
            ST_Distance(
                geography(ST_MakePoint(s.longtitude::float8, s.latitude::float8)),
                ${originGeo}
            ) / 1000.0 AS "distanceKm"
        FROM service s
        JOIN category c ON c.id = s.category_id
        WHERE ${whereClause}
        ORDER BY
            geography(ST_MakePoint(s.longtitude::float8, s.latitude::float8)) <-> ${originGeo}
        LIMIT ${take}
        OFFSET ${skip}
    `;

        return rows;
    }
}
