import { Module } from '@nestjs/common';
import { SignatureServiceService } from './signature-service.service';
import { SignatureServiceAdminController } from './controllers/admin/signature-service-admin.controller';
import { SignatureServiceCustomerController } from './controllers/customer/signature-service-customer.controller';
import { SignatureServiceProviderController } from './controllers/provider/signature-service-provider.controller';

@Module({
  controllers: [
    SignatureServiceAdminController,
    SignatureServiceCustomerController,
    SignatureServiceProviderController,
  ],
  providers: [SignatureServiceService],
})
export class SignatureServiceModule {}
