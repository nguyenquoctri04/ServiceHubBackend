import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SecureRpcService } from '@app/common';
import { CustomerBillingPatterns } from '@app/common/constants/customer.billing.patterns';
import type { Webhook } from '@payos/node';

@Injectable()
export class CustomerPaymentsService {
    constructor(
        @Inject('BILLING_SERVICE')
        private readonly billingClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    /** Forward PayOS webhook to billing-service. */
    async handlePayOsWebhook(body: Webhook) {
        return this.secureRpc.send(
            this.billingClient,
            { cmd: CustomerBillingPatterns.PAYMENTS_PAYOS_WEBHOOK },
            body,
        );
    }
}
