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
}
