import { Controller, Get } from '@nestjs/common';
import { CustomerServiceService } from '../../customer-service.service';

@Controller('customer/customer')
export class CustomerServiceCustomerController {
  constructor(private readonly service: CustomerServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Customer Service',
      actor: 'CUSTOMER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
