import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SecureRpcService } from '@app/common';
import { CustomerBillingPatterns } from '@app/common/constants/customer.billing.patterns';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto } from '@app/common/dto/billing/pay-invoice.dto';

@Injectable()
export class CustomerInvoicesService {
    constructor(
        @Inject('BILLING_SERVICE')
        private readonly billingClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    /**
     * GET /api/customer/billing/invoices
     * Danh sách hóa đơn của customer, có phân trang và filter theo status.
     */
    async findInvoices(customerId: string, query: InvoiceQueryDto) {
        return this.secureRpc.send(
            this.billingClient,
            { cmd: CustomerBillingPatterns.INVOICES_FIND },
            { customerId, query },
        );
    }

    /**
     * GET /api/customer/billing/invoices/:id
     * Chi tiết một hóa đơn — chỉ trả về nếu thuộc customerId này.
     */
    async findOneInvoice(customerId: string, invoiceId: string) {
        return this.secureRpc.send(
            this.billingClient,
            { cmd: CustomerBillingPatterns.INVOICES_FIND_ONE },
            { customerId, invoiceId },
        );
    }

    /**
     * POST /api/customer/billing/invoices/:id/pay
     * Thanh toán hóa đơn.
     *   CASH    → { paymentMethod: 'CASH', status: 'SUCCESS', paymentId }
     *   VNPAY   → { paymentId, paymentUrl, paymentMethod: 'VNPAY' }
     *   ZALOPAY → { paymentId, paymentUrl, paymentMethod: 'ZALOPAY' }
     */
    async payInvoice(
        customerId: string,
        invoiceId: string,
        dto: PayInvoiceDto,
        ipAddr: string,
    ) {
        return this.secureRpc.send(
            this.billingClient,
            { cmd: CustomerBillingPatterns.INVOICES_PAY },
            { customerId, invoiceId, dto, ipAddr },
        );
    }
}
