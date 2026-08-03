import { Controller, Get } from '@nestjs/common';
import { ProviderServiceService } from '../../provider-service.service';

@Controller('provider/provider')
export class ProviderServiceProviderController {
  constructor(private readonly service: ProviderServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Provider Service',
      actor: 'PROVIDER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
