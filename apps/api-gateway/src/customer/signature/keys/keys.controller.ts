import { CUSTOMER_KEYS } from "@app/common/constants/customer.endpoint";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CustomerKeysService } from "./keys.service";
import { CreateSignatureKeyDto, CreateSignatureKeyResponse } from "@app/common/dto/customer/signature";
import { CurrentUser, JwtAuthGuard } from "@app/common";
import { CurrentUserPayload } from "apps/api-gateway/src/provider/provider.controller";

@Controller(CUSTOMER_KEYS)
export class CustomerKeysController {
    constructor(private readonly service: CustomerKeysService) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    async createKey(
        @Body() dto: CreateSignatureKeyDto,
        @CurrentUser() user: CurrentUserPayload,
    ): Promise<CreateSignatureKeyResponse> {
        const identityId = user.id;

        return this.service.createKey(identityId, dto);
    }
}
