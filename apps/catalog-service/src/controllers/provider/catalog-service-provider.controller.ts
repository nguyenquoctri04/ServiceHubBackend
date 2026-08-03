import { Controller, Get } from '@nestjs/common';
import { CatalogServiceService } from '../../catalog-service.service';

@Controller('provider/catalog')
export class CatalogServiceProviderController {
  constructor(private readonly service: CatalogServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Service Catalog Service',
      actor: 'PROVIDER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
