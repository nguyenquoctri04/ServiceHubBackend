import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InvoicesService } from './invoices.service';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';

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

  @MessagePattern({ cmd: ProviderBillingPatterns.INVOICES_OUTSTANDING_TOTALS })
  async findOutstandingTotals(@Payload() payload: { providerId: string; contractIds: string[] }) {
    return this.service.findOutstandingTotals(payload.providerId, payload.contractIds);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.INVOICES_DASHBOARD_STATS })
  async getDashboardStats(@Payload() payload: { providerId: string }) {
    return this.service.getDashboardStats(payload.providerId);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.INVOICES_REVENUE_GROWTH })
  async getRevenueGrowth(@Payload() payload: { providerId: string }) {
    return this.service.getRevenueGrowth(payload.providerId);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.INVOICES_AGING })
  async getInvoiceAging(@Payload() payload: { providerId: string }) {
    return this.service.getInvoiceAging(payload.providerId);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.INVOICES_RECENT_PAYMENTS })
  async getRecentPayments(@Payload() payload: { providerId: string }) {
    return this.service.getRecentPayments(payload.providerId);
  }
}
