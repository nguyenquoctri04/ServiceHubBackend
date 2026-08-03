import { Controller, Get } from '@nestjs/common';
import { ApiGatewayService } from '../../api-gateway.service';

@Controller('customer/gateway')
export class ApiGatewayCustomerController {
  constructor(private readonly gatewayService: ApiGatewayService) {}

  @Get('status')
  getCustomerStatus() {
    return {
      role: 'CUSTOMER',
      status: 'API Gateway Customer Endpoint OK',
      timestamp: new Date().toISOString(),
    };
  }
}
