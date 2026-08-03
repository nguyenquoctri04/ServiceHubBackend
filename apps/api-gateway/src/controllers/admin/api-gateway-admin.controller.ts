import { Controller, Get } from '@nestjs/common';
import { ApiGatewayService } from '../../api-gateway.service';

@Controller('admin/gateway')
export class ApiGatewayAdminController {
  constructor(private readonly gatewayService: ApiGatewayService) {}

  @Get('status')
  getAdminStatus() {
    return {
      role: 'ADMIN',
      status: 'API Gateway Admin Endpoint OK',
      timestamp: new Date().toISOString(),
    };
  }
}
