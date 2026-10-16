import { CUSTOMER_IDENTITIES, CUSTOMER_IDENTITY_ENDPOINT } from "@app/common/constants/customer.endpoint";
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CustomerIdentitiesService } from "./identities.service";
import { CurrentUser, JwtAuthGuard, OptionalJwtAuthGuard } from "@app/common";
import { CurrentUserPayload } from "apps/api-gateway/src/provider/provider.controller";

@Controller(CUSTOMER_IDENTITIES)
@UseGuards(JwtAuthGuard)
export class CustomerIdentitiesController {
    constructor(private readonly service: CustomerIdentitiesService) {}

    /** GET /api/customer/identity/identities/me — lấy profile + IdentityDocument */
    @Get("me")
    async getMyProfile(@CurrentUser() user: CurrentUserPayload) {
        return this.service.getMyProfile(user.id);
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(CUSTOMER_IDENTITY_ENDPOINT.FETCH_PROVIDER_DETAIL)
    async getProviderDetail(
        @Param("id") id: string,
        @CurrentUser("id") customerId: string | null,
    ) {
        return this.service.getProviderDetail(id, customerId ?? undefined);
    }

    @Get(CUSTOMER_IDENTITY_ENDPOINT.FETCH_CUSTOMER_INFORMATION)
    @UseGuards(JwtAuthGuard)
    async getCustomerInformation(@CurrentUser() user: CurrentUserPayload) {
        if (!user) {
            throw new Error("Tài khoản không hợp lệ");
        }

        return this.service.getCustomerInformation(user.id);
    }
}
