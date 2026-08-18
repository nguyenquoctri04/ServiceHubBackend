import { CUSTOMER_IDENTITIES, CUSTOMER_IDENTITY_ENDPOINT } from "@app/common/constants/customer.endpoint";
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CustomerIdentitiesService } from "./identities.service";
import { CurrentUser, OptionalJwtAuthGuard } from "@app/common";

@Controller(CUSTOMER_IDENTITIES)
export class CustomerIdentitiesController {
    constructor(private readonly service: CustomerIdentitiesService) {}

    @UseGuards(OptionalJwtAuthGuard)
    @Get(CUSTOMER_IDENTITY_ENDPOINT.FETCH_PROVIDER_DETAIL)
    async getProviderDetail(
        @Param("id") id: string,
        @CurrentUser("id") customerId: string | null,
    ) {
        return this.service.getProviderDetail(id, customerId ?? undefined);
    }
}
