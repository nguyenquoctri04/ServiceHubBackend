import { Controller, Get } from '@nestjs/common';
import { CustomerServiceService } from '../../customer-service.service';

@Controller('admin/customer')
export class CustomerServiceAdminController {
  constructor(private readonly service: CustomerServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Customer Service',
      actor: 'ADMIN',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
