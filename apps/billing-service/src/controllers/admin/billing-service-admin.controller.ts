import { Controller, Get } from '@nestjs/common';
import { BillingServiceService } from '../../billing-service.service';

@Controller('admin/billing')
export class BillingServiceAdminController {
  constructor(private readonly service: BillingServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Billing & Payment Service',
      actor: 'ADMIN',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
