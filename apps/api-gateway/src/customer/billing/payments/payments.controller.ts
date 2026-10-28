import {
    Body,
    Controller,
    Post,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { CUSTOMER_PAYMENTS } from '@app/common/constants/customer.endpoint';
import { CustomerPaymentsService } from './payments.service';
import type { Webhook } from '@payos/node';

@Controller(CUSTOMER_PAYMENTS)
export class CustomerPaymentsController {
    constructor(private readonly service: CustomerPaymentsService) {}

    /**
     * POST /api/customer/billing/payments/payos/webhook
     * Public endpoint for PayOS server notifications. Business logic and
     * signature validation are handled by billing-service.
     */
    @Post('payos/webhook')
    @HttpCode(HttpStatus.OK)
    handlePayOsWebhook(@Body() body: Webhook) {
        return this.service.handlePayOsWebhook(body);
    }
}
