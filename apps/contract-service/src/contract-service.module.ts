import { Module } from '@nestjs/common';
import { ContractServiceService } from './contract-service.service';
import { ContractServiceAdminController } from './controllers/admin/contract-service-admin.controller';
import { ContractServiceCustomerController } from './controllers/customer/contract-service-customer.controller';
import { ContractServiceProviderController } from './controllers/provider/contract-service-provider.controller';

@Module({
  controllers: [
    ContractServiceAdminController,
    ContractServiceCustomerController,
    ContractServiceProviderController,
  ],
  providers: [ContractServiceService],
})
export class ContractServiceModule {}
