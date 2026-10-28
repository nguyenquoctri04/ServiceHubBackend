import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CustomerBillingPatterns } from "@app/common/constants/customer.billing.patterns";
import type { Webhook } from "@payos/node";
import { CustomerPaymentsService } from "./customer.payments.service";

@Controller()
export class CustomerPaymentsController {
    constructor(
        private readonly service: CustomerPaymentsService
    ) {}

    @MessagePattern({ cmd: CustomerBillingPatterns.PAYMENTS_PAYOS_WEBHOOK })
    handlePayOsWebhook(@Payload() body: Webhook) {
        return this.service.handlePayOsWebhook(body);
    }
}
