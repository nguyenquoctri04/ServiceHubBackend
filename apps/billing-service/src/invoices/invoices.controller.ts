import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InvoicesService } from './invoices.service';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto } from '@app/common/dto/billing/pay-invoice.dto';

@Controller()
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @MessagePattern({ cmd: ProviderBillingPatterns.INVOICES_FIND })
  async findInvoices(@Payload() payload: { providerId: string; query: InvoiceQueryDto }) {
    return this.service.findInvoices(payload.providerId, payload.query);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.INVOICES_PAY })
  async payInvoice(@Payload() payload: { providerId: string; invoiceId: string; dto: PayInvoiceDto; idempotencyKey: string }) {
    return this.service.payInvoice(payload.providerId, payload.invoiceId, payload.dto, payload.idempotencyKey);
  }
}
