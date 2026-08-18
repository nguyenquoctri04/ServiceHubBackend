import { Controller } from "@nestjs/common";
import { CustomerContractsService } from "./customer.contracts.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";

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

    @MessagePattern({ cmd: CustomerPatterns.CREATE_SERVICE_REQUEST })
    async createServiceRequest(@Payload() payload: {
        customerId: string;
        dto: { providerId: string; servicePriceIds: string[]; requireSignature?: boolean };
    }) {
        return this.service.createServiceRequest(payload.customerId, payload.dto);
    }
}
