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
}
