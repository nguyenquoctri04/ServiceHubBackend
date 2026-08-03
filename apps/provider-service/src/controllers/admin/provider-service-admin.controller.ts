import { Controller, Get } from '@nestjs/common';
import { ProviderServiceService } from '../../provider-service.service';

@Controller('admin/provider')
export class ProviderServiceAdminController {
  constructor(private readonly service: ProviderServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Provider Service',
      actor: 'ADMIN',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
