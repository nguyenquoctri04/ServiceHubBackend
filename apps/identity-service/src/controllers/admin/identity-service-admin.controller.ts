import { Controller, Get } from '@nestjs/common';
import { IdentityServiceService } from '../../identity-service.service';

@Controller('admin/identity')
export class IdentityServiceAdminController {
  constructor(private readonly service: IdentityServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Identity & eKYC Service',
      actor: 'ADMIN',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
