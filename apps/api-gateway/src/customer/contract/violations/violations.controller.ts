import { CUSTOMER_VIOLATIONS } from "@app/common/constants/customer.endpoint";
import { CUSTOMER_VIOLATION_REPORTS_ROUTE } from "@app/common/constants/customer.endpoint";
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CustomerViolationsService } from "./violations.service";
import { CurrentUser, JwtAuthGuard } from "@app/common";
import { CreateCustomerViolationDto } from "./dto/create-customer-violation.dto";

@Controller(CUSTOMER_VIOLATIONS)
export class CustomerViolationsController {
    constructor(private readonly service: CustomerViolationsService) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    async getViolationRules() {
        return this.service.getViolationRules();
    }

    @UseGuards(JwtAuthGuard)
    @Post(CUSTOMER_VIOLATION_REPORTS_ROUTE)
    async createViolationReport(
        @CurrentUser("id") customerId: string,
        @Body() dto: CreateCustomerViolationDto,
    ) {
        return this.service.createViolationReport(customerId, dto);
    }
}
