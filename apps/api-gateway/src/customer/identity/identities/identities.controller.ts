import { CUSTOMER_IDENTITIES } from "@app/common/constants/customer.endpoint";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { CustomerIdentitiesService } from "./identities.service";
import { CurrentUser, JwtAuthGuard } from "@app/common";

type CurrentUserPayload = {
    id: string;
    email: string;
    role: string;
};

@Controller(CUSTOMER_IDENTITIES)
@UseGuards(JwtAuthGuard)
export class CustomerIdentitiesController {
    constructor(private readonly service: CustomerIdentitiesService) {}

    /** GET /api/customer/identity/identities/me — lấy profile + IdentityDocument */
    @Get("me")
    async getMyProfile(@CurrentUser() user: CurrentUserPayload) {
        return this.service.getMyProfile(user.id);
    }
}
