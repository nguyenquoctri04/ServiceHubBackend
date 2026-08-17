import { Controller } from "@nestjs/common";
import { CustomerServicesService } from "./customer.services.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { MarketplaceServicesQueryDto } from "@app/common/dto/customer/catalog";

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
    getServices(query: MarketplaceServicesQueryDto) {
        return this.service.getMarketplaceServices(query);
    }
}
