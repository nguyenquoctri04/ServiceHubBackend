import { Module } from '@nestjs/common';
import { CustomerServiceService } from './customer-service.service';
import { CustomerServiceAdminController } from './controllers/admin/customer-service-admin.controller';
import { CustomerServiceCustomerController } from './controllers/customer/customer-service-customer.controller';
import { CustomerServiceProviderController } from './controllers/provider/customer-service-provider.controller';

@Module({
  controllers: [
    CustomerServiceAdminController,
    CustomerServiceCustomerController,
    CustomerServiceProviderController,
  ],
  providers: [CustomerServiceService],
})
export class CustomerServiceModule {}
