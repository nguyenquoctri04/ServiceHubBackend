import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomerServicesService {
    constructor(private readonly prisma: PrismaService) {}

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
}
