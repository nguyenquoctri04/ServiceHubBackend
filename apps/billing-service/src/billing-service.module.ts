import { Module } from '@nestjs/common';
import { BillingServiceService } from './billing-service.service';
import { BillingServiceAdminController } from './controllers/admin/billing-service-admin.controller';
import { BillingServiceCustomerController } from './controllers/customer/billing-service-customer.controller';
import { BillingServiceProviderController } from './controllers/provider/billing-service-provider.controller';

@Module({
  controllers: [
    BillingServiceAdminController,
    BillingServiceCustomerController,
    BillingServiceProviderController,
  ],
  providers: [BillingServiceService],
})
export class BillingServiceModule {}
