import { Controller, Get } from '@nestjs/common';
import { PropertyServiceService } from '../../property-service.service';

@Controller('customer/property')
export class PropertyServiceCustomerController {
  constructor(private readonly service: PropertyServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Property Management Service',
      actor: 'CUSTOMER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
