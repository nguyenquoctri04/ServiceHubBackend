import { Controller, Get } from '@nestjs/common';
import { CatalogServiceService } from '../../catalog-service.service';

@Controller('admin/catalog')
export class CatalogServiceAdminController {
  constructor(private readonly service: CatalogServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Service Catalog Service',
      actor: 'ADMIN',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
