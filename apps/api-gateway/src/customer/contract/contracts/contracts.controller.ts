import {
    CUSTOMER_CONTRACT_ENDPOINT,
    CUSTOMER_CONTRACTS,
} from "@app/common/constants/customer.endpoint";
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from "@nestjs/common";
import { CustomerContractsService } from "./contracts.service";
import { CurrentUser, JwtAuthGuard } from "@app/common";
import {
    CreateServiceBookingDto,
    GetCustomerServicesDto,
} from "@app/common/dto/customer/contract";
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
        console.log(dto);
        return this.service.createServiceBooking(user.id, user.email, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get(CUSTOMER_CONTRACT_ENDPOINT.GET_USED_SERVICES)
    async getUsedServices(
        @CurrentUser("id") customerId: string,
        @Query() query: GetCustomerServicesDto,
    ) {
        return this.service.getUsedServices(customerId, query);
    }

    @UseGuards(JwtAuthGuard)
    @Get(CUSTOMER_CONTRACT_ENDPOINT.GET_USED_SERVICES + "/:contractId/detail")
    async getUsedServiceDetail(
        @CurrentUser("id") customerId: string,
        @Param("contractId") contractId: string,
    ) {
        return this.service.getUsedServiceDetail(customerId, contractId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(CUSTOMER_CONTRACT_ENDPOINT.VIEW_CONTRACT)
    async viewContract(
        @Param("contractId") contractId: string,
        @CurrentUser("id") identityId: string,
    ) {
        return this.service.viewContract(contractId, identityId);
    }
}
