import { Controller, Get } from '@nestjs/common';
import { BillingServiceService } from '../../billing-service.service';

@Controller('customer/billing')
export class BillingServiceCustomerController {
  constructor(private readonly service: BillingServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Billing & Payment Service',
      actor: 'CUSTOMER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
