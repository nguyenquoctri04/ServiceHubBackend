import { Module } from '@nestjs/common';
import { IdentityServiceService } from './identity-service.service';
import { IdentityServiceAdminController } from './controllers/admin/identity-service-admin.controller';
import { IdentityServiceCustomerController } from './controllers/customer/identity-service-customer.controller';
import { IdentityServiceProviderController } from './controllers/provider/identity-service-provider.controller';

@Module({
  controllers: [
    IdentityServiceAdminController,
    IdentityServiceCustomerController,
    IdentityServiceProviderController,
  ],
  providers: [IdentityServiceService],
})
export class IdentityServiceModule {}
