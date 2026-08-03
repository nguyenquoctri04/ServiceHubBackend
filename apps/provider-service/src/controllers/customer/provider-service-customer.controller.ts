import { Controller, Get } from '@nestjs/common';
import { ProviderServiceService } from '../../provider-service.service';

@Controller('customer/provider')
export class ProviderServiceCustomerController {
  constructor(private readonly service: ProviderServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Provider Service',
      actor: 'CUSTOMER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
