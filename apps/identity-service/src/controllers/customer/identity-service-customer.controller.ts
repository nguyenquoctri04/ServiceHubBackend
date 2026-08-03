import { Controller, Get } from '@nestjs/common';
import { IdentityServiceService } from '../../identity-service.service';

@Controller('customer/identity')
export class IdentityServiceCustomerController {
  constructor(private readonly service: IdentityServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Identity & eKYC Service',
      actor: 'CUSTOMER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
