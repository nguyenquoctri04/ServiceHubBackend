import { Controller, Get } from '@nestjs/common';
import { CatalogServiceService } from '../../catalog-service.service';

@Controller('customer/catalog')
export class CatalogServiceCustomerController {
  constructor(private readonly service: CatalogServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Service Catalog Service',
      actor: 'CUSTOMER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
