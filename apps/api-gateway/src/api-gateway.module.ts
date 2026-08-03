import { Module } from '@nestjs/common';
import { ApiGatewayService } from './api-gateway.service';
import { ApiGatewayAdminController } from './controllers/admin/api-gateway-admin.controller';
import { ApiGatewayCustomerController } from './controllers/customer/api-gateway-customer.controller';
import { ApiGatewayProviderController } from './controllers/provider/api-gateway-provider.controller';

@Module({
  imports: [],
  controllers: [
    ApiGatewayAdminController,
    ApiGatewayCustomerController,
    ApiGatewayProviderController,
  ],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
