import {
    CUSTOMER_CONTRACT_ENDPOINT,
    CUSTOMER_CONTRACTS,
} from "@app/common/constants/customer.endpoint";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CustomerContractsService } from "./contracts.service";
import { CurrentUser, JwtAuthGuard } from "@app/common";
import { CreateServiceBookingDto } from "@app/common/dto/customer/contract";
import { CurrentUserPayload } from "apps/api-gateway/src/provider/provider.controller";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";

@Controller(CUSTOMER_CONTRACTS)
export class CustomerContractsController {
    constructor(private readonly service: CustomerContractsService) {}

    @UseGuards(JwtAuthGuard)
    @Post(CUSTOMER_CONTRACT_ENDPOINT.CREATE_SERVICE_BOOKING)
    async createServiceBooking(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: CreateServiceBookingDto,
    ) {
        return this.service.createServiceBooking(user.id, user.email, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('requests')
    async createServiceRequest(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: CreateServiceRequestDto,
    ) {
        return this.service.createServiceRequest(user.id, dto);
    }
}
