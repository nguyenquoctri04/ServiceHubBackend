import { CUSTOMER_VIOLATIONS } from "@app/common/constants/customer.endpoint";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { CustomerViolationsService } from "./violations.service";
import { JwtAuthGuard } from "@app/common";

@Controller(CUSTOMER_VIOLATIONS)
export class CustomerViolationsController {
    constructor(private readonly service: CustomerViolationsService) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    async getViolationRules() {
        return this.service.getViolationRules();
    }
}
