import { Module } from '@nestjs/common';
import { CatalogServiceService } from './catalog-service.service';
import { CatalogServiceAdminController } from './controllers/admin/catalog-service-admin.controller';
import { CatalogServiceCustomerController } from './controllers/customer/catalog-service-customer.controller';
import { CatalogServiceProviderController } from './controllers/provider/catalog-service-provider.controller';

@Module({
  controllers: [
    CatalogServiceAdminController,
    CatalogServiceCustomerController,
    CatalogServiceProviderController,
  ],
  providers: [CatalogServiceService],
})
export class CatalogServiceModule {}
