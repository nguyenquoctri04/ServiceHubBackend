import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomerIdentitiesService {
    constructor(private readonly prisma: PrismaService) {}

    async getProvidersInPopularByIds(providerIds: string[]) {
        const providers = await this.prisma.provider.findMany({
            where: {
                id: {
                    in: providerIds,
                },
                status: "ACTIVE",
            },
            select: {
                id: true,
                providerName: true,
                logoUrl: true
            },
        });

        return providers;
    }
}
