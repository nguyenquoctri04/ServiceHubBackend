import { CUSTOMER_INVOICES } from "@app/common/constants/customer.endpoint";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CustomerInvoicesService } from "./invoices.service";
import { CurrentUser, JwtAuthGuard } from "@app/common";
import { CurrentUserPayload } from "apps/api-gateway/src/provider/provider.controller";
import { CustomerInvoicesQueryDto } from "@app/common/dto/customer/billing";

@Controller(CUSTOMER_INVOICES)
export class CustomerInvoicesController {
    constructor(private readonly service: CustomerInvoicesService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    fetchInvoices(
        @Query() query: CustomerInvoicesQueryDto,
        @CurrentUser() user: CurrentUserPayload
    ) {
        return this.service.fetchInvoices(query, user);
    }
}