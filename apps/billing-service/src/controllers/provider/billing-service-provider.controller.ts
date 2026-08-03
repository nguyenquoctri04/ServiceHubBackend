import { Controller, Get } from '@nestjs/common';
import { BillingServiceService } from '../../billing-service.service';

@Controller('provider/billing')
export class BillingServiceProviderController {
  constructor(private readonly service: BillingServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Billing & Payment Service',
      actor: 'PROVIDER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
