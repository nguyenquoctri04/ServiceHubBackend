import { Module } from '@nestjs/common';
import { ProviderServiceService } from './provider-service.service';
import { ProviderServiceAdminController } from './controllers/admin/provider-service-admin.controller';
import { ProviderServiceCustomerController } from './controllers/customer/provider-service-customer.controller';
import { ProviderServiceProviderController } from './controllers/provider/provider-service-provider.controller';

@Module({
  controllers: [
    ProviderServiceAdminController,
    ProviderServiceCustomerController,
    ProviderServiceProviderController,
  ],
  providers: [ProviderServiceService],
})
export class ProviderServiceModule {}
