import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomerViolationsService {
    constructor(private readonly prisma: PrismaService) {}

    async getViolationRules() {
        const response = await this.prisma.violationRule.findMany({
            where: {
                AND: [{ targetType: "PROVIDER" }, { isActive: true }],
            },
            select: {
                id: true,
                name: true,
            },
        });

        return response;
    }
}
