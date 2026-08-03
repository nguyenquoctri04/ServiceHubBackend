import { Controller, Get } from '@nestjs/common';
import { ApiGatewayService } from '../../api-gateway.service';

@Controller('provider/gateway')
export class ApiGatewayProviderController {
  constructor(private readonly gatewayService: ApiGatewayService) {}

  @Get('status')
  getProviderStatus() {
    return {
      role: 'PROVIDER',
      status: 'API Gateway Provider Endpoint OK',
      timestamp: new Date().toISOString(),
    };
  }
}
