import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SecureRpcService } from '@app/common';
import { CustomerBillingPatterns } from '@app/common/constants/customer.billing.patterns';

@Injectable()
export class CustomerPaymentsService {
    constructor(
        @Inject('BILLING_SERVICE')
        private readonly billingClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    /**
     * Xử lý callback redirect từ VNPay (query params).
     * Endpoint này là PUBLIC — không cần JWT.
     */
    async handleVnpayCallback(params: Record<string, string>) {
        return this.secureRpc.send(
            this.billingClient,
            { cmd: CustomerBillingPatterns.PAYMENTS_VNPAY_CALLBACK },
            params,
        );
    }

    /**
     * Xử lý IPN callback từ ZaloPay server (POST JSON).
     * Endpoint này là PUBLIC — không cần JWT.
     * Phải trả về { return_code, return_message } cho ZaloPay.
     */
    async handleZalopayCallback(body: { data: string; mac: string; type: number }) {
        return this.secureRpc.send(
            this.billingClient,
            { cmd: CustomerBillingPatterns.PAYMENTS_ZALOPAY_CALLBACK },
            body,
        );
    }

    /**
     * Kiểm tra trạng thái payment.
     * FE gọi sau khi redirect về trang kết quả để polling.
     */
    async checkPaymentStatus(paymentId: string) {
        return this.secureRpc.send(
            this.billingClient,
            { cmd: CustomerBillingPatterns.PAYMENTS_CHECK_STATUS },
            { paymentId },
        );
    }
}
