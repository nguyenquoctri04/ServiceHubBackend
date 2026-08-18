import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InvoicesService } from './invoices.service';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { CustomerBillingPatterns } from '@app/common/constants/customer.billing.patterns';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto } from '@app/common/dto/billing/pay-invoice.dto';

@Controller()
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  // ── Provider patterns ──────────────────────────────────────────────────────

  @MessagePattern({ cmd: ProviderBillingPatterns.INVOICES_FIND })
  findInvoices(
    @Payload() payload: { providerId: string; query: InvoiceQueryDto },
  ) {
    return this.service.findInvoices(payload.providerId, payload.query);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.INVOICES_PAY })
  payInvoice(
    @Payload()
    payload: {
      providerId:     string;
      invoiceId:      string;
      dto:            PayInvoiceDto;
      idempotencyKey: string;
      ipAddr?:        string;
    },
  ) {
    return this.service.payInvoice(
      payload.providerId,
      payload.invoiceId,
      payload.dto,
      payload.idempotencyKey,
      payload.ipAddr,
    );
  }

  // ── Customer patterns ──────────────────────────────────────────────────────

  @MessagePattern({ cmd: CustomerBillingPatterns.INVOICES_FIND })
  findCustomerInvoices(
    @Payload() payload: { customerId: string; query: InvoiceQueryDto },
  ) {
    return this.service.findCustomerInvoices(payload.customerId, payload.query);
  }

  @MessagePattern({ cmd: CustomerBillingPatterns.INVOICES_FIND_ONE })
  findOneCustomerInvoice(
    @Payload() payload: { customerId: string; invoiceId: string },
  ) {
    return this.service.findOneCustomerInvoice(payload.customerId, payload.invoiceId);
  }

  @MessagePattern({ cmd: CustomerBillingPatterns.INVOICES_PAY })
  customerPayInvoice(
    @Payload()
    payload: {
      customerId: string;
      invoiceId:  string;
      dto:        PayInvoiceDto;
      ipAddr?:    string;
    },
  ) {
    return this.service.customerPayInvoice(
      payload.customerId,
      payload.invoiceId,
      payload.dto,
      payload.ipAddr,
    );
  }
}
