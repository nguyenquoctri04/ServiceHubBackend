import {
    CUSTOMER_INVOICE_QR_CODE,
    CUSTOMER_INVOICE_PAYMENT_STATUS,
    CUSTOMER_INVOICES,
} from "@app/common/constants/customer.endpoint";
import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CustomerInvoicesService } from "./invoices.service";
import { CurrentUser, JwtAuthGuard } from "@app/common";
import { CurrentUserPayload } from "apps/api-gateway/src/provider/provider.controller";
import { CustomerInvoicesQueryDto } from "@app/common/dto/customer/billing";

@Controller()
export class CustomerInvoicesController {
    constructor(private readonly service: CustomerInvoicesService) {}

    @Get(CUSTOMER_INVOICES)
    @UseGuards(JwtAuthGuard)
    fetchInvoices(
        @Query() query: CustomerInvoicesQueryDto,
        @CurrentUser() user: CurrentUserPayload
    ) {
        return this.service.fetchInvoices(query, user);
    }

    @Post(CUSTOMER_INVOICE_QR_CODE)
    @UseGuards(JwtAuthGuard)
    createQrCode(
        @Param("invoiceId") invoiceId: string,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.service.createQrCode(invoiceId, user);
    }

    @Get(CUSTOMER_INVOICE_PAYMENT_STATUS)
    @UseGuards(JwtAuthGuard)
    checkPaymentStatus(
        @Param("invoiceId") invoiceId: string,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.service.checkPaymentStatus(invoiceId, user);
    }
}
