import { Inject, Injectable } from "@nestjs/common";
import { RpcException, ClientProxy } from "@nestjs/microservices";
import { ContractStatus } from '@prisma/client-contract';
import { randomUUID } from 'crypto';
import { SecureRpcService } from '@app/common';
import { PrismaService } from "../prisma/prisma.service";

interface PopularServiceInput {
    serviceId: string;
    providerId: string;
}

@Injectable()
export class CustomerContractsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
        @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
        @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    async createServiceRequest(customerId: string, dto: {
        providerId: string;
        servicePriceIds: string[];
        requireSignature?: boolean;
    }) {
        const priceIds = [...new Set(dto.servicePriceIds)];
        if (!priceIds.length || priceIds.length !== dto.servicePriceIds.length) {
            throw new RpcException({ statusCode: 400, message: 'Danh sách dịch vụ yêu cầu không hợp lệ.' });
        }

        const provider = await this.secureRpc.send<{ id: string; identityId: string }>(
            this.identityClient, { cmd: 'get.provider.by.id' }, dto.providerId,
        );
        const prices = await this.secureRpc.send<{ id: string }[]>(
            this.catalogClient, { cmd: 'services.prices.findForProvider' }, { providerId: provider.id, priceIds },
        );
        if (prices.length !== priceIds.length) {
            throw new RpcException({ statusCode: 400, message: 'Dịch vụ đã chọn không thuộc nhà cung cấp.' });
        }

        const now = new Date();
        const contract = await this.prisma.$transaction((tx) => tx.contract.create({
            data: {
                contractNumber: `YCDV-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
                providerId: provider.id,
                customerId,
                startDate: now,
                status: ContractStatus.DRAFT,
                requireSignature: dto.requireSignature ?? false,
                createdAt: now,
                updatedAt: now,
                services: { create: priceIds.map((servicePriceId) => ({ servicePriceId, createdAt: now })) },
            },
            include: { services: true },
        }));

        await this.secureRpc.send(
            this.notificationClient,
            { cmd: 'notifications.createInApp' },
            {
                userId: provider.identityId,
                providerId: provider.id,
                title: 'Yêu cầu sử dụng dịch vụ mới',
                content: `Khách hàng đã gửi yêu cầu sử dụng dịch vụ. Mã yêu cầu: ${contract.contractNumber}.`,
            },
        );
        return contract;
    }

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
