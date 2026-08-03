import { Controller, Get } from '@nestjs/common';
import { CustomerServiceService } from '../../customer-service.service';

@Controller('provider/customer')
export class CustomerServiceProviderController {
  constructor(private readonly service: CustomerServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Customer Service',
      actor: 'PROVIDER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
