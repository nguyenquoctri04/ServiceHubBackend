import {
    CUSTOMER_CONTRACT_ENDPOINT,
    CUSTOMER_CONTRACTS,
} from "@app/common/constants/customer.endpoint";
import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CustomerContractsService } from "./contracts.service";
import { CurrentUser, JwtAuthGuard } from "@app/common";
import { CreateServiceBookingDto } from "@app/common/dto/customer/contract";
import { CurrentUserPayload } from "apps/api-gateway/src/provider/provider.controller";

@Controller(CUSTOMER_CONTRACTS)
export class CustomerContractsController {
    constructor(private readonly service: CustomerContractsService) {}

    @UseGuards(JwtAuthGuard)
    @Post(CUSTOMER_CONTRACT_ENDPOINT.CREATE_SERVICE_BOOKING)
    async createServiceBooking(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: CreateServiceBookingDto,
    ) {
        console.log(dto)
        return this.service.createServiceBooking(user.id, user.email, dto);
    }
}
