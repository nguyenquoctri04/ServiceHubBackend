import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomerCategoriesService {
    constructor(private readonly prisma: PrismaService) {}

    async getHomeCategories() {
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

        return categories.map((category) => ({
            id: category.id,
            name: category.name,
            totalService: category._count.services,
        }));
    }
}
