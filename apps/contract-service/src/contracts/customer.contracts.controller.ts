import { Controller } from "@nestjs/common";
import { CustomerContractsService } from "./customer.contracts.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { CreateServiceBookingCommand } from "@app/common/dto/customer/contract";

@Controller()
export class CustomerContractsController {
    constructor(private readonly service: CustomerContractsService) {}

    @MessagePattern({
        cmd: CustomerPatterns.GET_POPULAR_SERVICES,
    })
    async getPopularServices(
        @Payload()
        payload: {
            servicePriceIds: string[];
            limit: number;
        },
    ) {
        return this.service.getPopularServices(
            payload.servicePriceIds,
            payload.limit,
        );
    }

    @MessagePattern({
        cmd: CustomerPatterns.GET_MARKETPLACE_RESTRICTIONS,
    })
    async getMarketplaceRestrictions(data: {
        customerId: string;
        serviceIds: string[];
        providerIds: string[];
    }) {
        return this.service.getMarketplaceRestrictions(data);
    }

    @MessagePattern({ cmd: CustomerPatterns.CHECK_SERVICE_ACCESS })
    async checkServiceAccess(
        @Payload()
        payload: {
            serviceId: string;
            providerId: string;
            customerId?: string;
        },
    ) {
        return this.service.checkServiceAccess(
            payload.serviceId,
            payload.providerId,
            payload.customerId,
        );
    }

    @MessagePattern({ cmd: CustomerPatterns.CHECK_PROVIDER_ACCESS })
    async checkProviderAccess(
        @Payload() payload: { providerId: string; customerId?: string },
    ) {
        return this.service.checkProviderAccess(
            payload.providerId,
            payload.customerId,
        );
    }

    @MessagePattern({ cmd: CustomerPatterns.GET_PROVIDER_SERVICE_INSIGHTS })
    async getProviderServiceInsights(
        @Payload()
        payload: {
            items: Array<{ serviceId: string; servicePriceIds: string[] }>;
            customerId?: string;
        },
    ) {
        return this.service.getProviderServiceInsights(
            payload.items,
            payload.customerId,
        );
    }

    @MessagePattern({ cmd: CustomerPatterns.CREATE_SERVICE_BOOKING })
    async createServiceBooking(
        @Payload()
        command: CreateServiceBookingCommand,
    ) {
        console.log(command.servicePriceId);
        return this.service.createServiceBooking(command);
    }

    @MessagePattern({
        cmd: CustomerPatterns.GET_CONTRACT_FILE_HASH_FOR_SIGNING,
    })
    async getContractFileHashForSigning(
        @Payload() payload: { contractFileId: string; identityId: string },
    ) {
        return this.service.getContractFileHashForSigning(
            payload.contractFileId,
            payload.identityId,
        );
    }

    @MessagePattern({
        cmd: CustomerPatterns.GET_CONTRACT_FILE_HASH_FOR_VERIFY,
    })
    async getContractFileHashForVerify(input: { contractFileId: string }) {
        return this.service.getContractFileHashForVerify(input.contractFileId);
    }
}
