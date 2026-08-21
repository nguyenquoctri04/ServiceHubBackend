import { Controller } from "@nestjs/common";
import { CustomerIdentitiesService } from "./customer.identities.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";

@Controller()
export class CustomerIdentitiesController {
    constructor(private readonly service: CustomerIdentitiesService) {}

    @MessagePattern({ cmd: CustomerPatterns.GET_PROVIDER_IN_POPULAR })
    async getProvidersInPopularByIds(
        @Payload() payload: { providerIds: string[] },
    ) {
        return this.service.getProvidersInPopularByIds(payload.providerIds);
    }

    @MessagePattern({ cmd: CustomerPatterns.GET_PROVIDER_SUMMARY })
    async getProviderDetails(@Payload() payload: { providerIds: string[] }) {
        return this.service.getSummaryProviders(payload.providerIds);
    }

    @MessagePattern({ cmd: CustomerPatterns.GET_PROVIDER_DETAIL_FOR_CUSTOMER })
    async getProviderDetailForCustomer(
        @Payload() payload: { providerId: string },
    ) {
        return this.service.getProviderDetailForCustomer(payload.providerId);
    }

    @MessagePattern({ cmd: CustomerPatterns.GET_CUSTOMER_INFORMATION })
    async getCustomerInformation(
        @Payload()
        payload: {
            customerId: string;
        },
    ) {
        return this.service.getCustomerInformation(payload.customerId);
    }

    @MessagePattern({ cmd: CustomerPatterns.GET_SIGNATURE_INFOR })
    async getSignatureInfo(
        @Payload()
        payload: {
            identityId: string;
        },
    ) {
        return this.service.getSignatureInfo(payload.identityId);
    }

    @MessagePattern({ cmd: CustomerPatterns.GET_PROVIDERS_FULL })
    async getProvidersFull(@Payload() payload: { providerIds: string[] }) {
        return this.service.getProvidersFull(payload.providerIds);
    }
}
