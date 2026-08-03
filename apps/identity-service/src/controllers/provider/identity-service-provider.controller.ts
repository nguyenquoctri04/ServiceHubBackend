import { Controller, Get } from '@nestjs/common';
import { IdentityServiceService } from '../../identity-service.service';

@Controller('provider/identity')
export class IdentityServiceProviderController {
  constructor(private readonly service: IdentityServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Identity & eKYC Service',
      actor: 'PROVIDER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
