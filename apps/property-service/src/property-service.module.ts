import { Module } from '@nestjs/common';
import { PropertyServiceService } from './property-service.service';
import { PropertyServiceAdminController } from './controllers/admin/property-service-admin.controller';
import { PropertyServiceCustomerController } from './controllers/customer/property-service-customer.controller';
import { PropertyServiceProviderController } from './controllers/provider/property-service-provider.controller';

@Module({
  controllers: [
    PropertyServiceAdminController,
    PropertyServiceCustomerController,
    PropertyServiceProviderController,
  ],
  providers: [PropertyServiceService],
})
export class PropertyServiceModule {}
