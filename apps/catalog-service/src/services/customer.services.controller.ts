import { Controller } from "@nestjs/common";
import { CustomerServicesService } from "./customer.services.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import {
    GetRelatedServicesDto,
    MarketplaceServicesQueryDto,
} from "@app/common/dto/customer/catalog";

@Controller()
export class CustomerServicesController {
    constructor(private readonly service: CustomerServicesService) {}

    @MessagePattern({
        cmd: CustomerPatterns.GET_ACTIVE_SERVICES_FOR_POPULAR,
    })
    async getActiveServicesForPopular() {
        return this.service.getActiveServicesForPopular();
    }

    @MessagePattern({ cmd: CustomerPatterns.GET_POPULAR_SERVICE_DETAIL })
    async getPopularServices(@Payload() payload: { serviceIds: string[] }) {
        return this.service.getPopularServicesByIds(payload.serviceIds);
    }

    @MessagePattern({
        cmd: CustomerPatterns.GET_SERVICE_PRICE_MAPPINGS,
    })
    async getServicePriceMappings() {
        return this.service.getServicePriceMappings();
    }

    @MessagePattern({
        cmd: CustomerPatterns.GET_SERVICES,
    })
    getServices(
        @Payload()
        payload: {
            query: MarketplaceServicesQueryDto;
            customerId: string | null;
        },
    ) {
        return this.service.getMarketplaceServices(payload);
    }

    @MessagePattern({ cmd: CustomerPatterns.GET_SERVICE_DETAIL })
    async getDetail(
        @Payload() payload: { serviceId: string; customerId: string | null },
    ) {
        return this.service.getDetail(payload.serviceId, payload.customerId);
    }

    @MessagePattern({ cmd: CustomerPatterns.GET_RELATED_SERVICES })
    async getRelated(
        @Payload()
        payload: {
            serviceId: string;
            customerId: string | null;
        } & GetRelatedServicesDto,
    ) {
        return this.service.getRelated(
            payload.serviceId,
            payload.customerId,
            payload.latitude,
            payload.longitude,
        );
    }

    @MessagePattern({
        cmd: CustomerPatterns.GET_PROVIDER_SERVICES_AND_PROPERTIES,
    })
    async getProviderServicesAndProperties(
        @Payload() payload: { providerId: string; customerId?: string },
    ) {
        return this.service.getProviderServicesAndProperties(
            payload.providerId,
            payload.customerId,
        );
    }

    @MessagePattern({ cmd: CustomerPatterns.VALIDATE_SERVICE_PRICE })
    async validateServicePrice(@Payload() payload: { servicePriceId: string }) {
        return this.service.validateServicePrice(payload.servicePriceId);
    }
}
