import { Controller, Get } from '@nestjs/common';
import { PropertyServiceService } from '../../property-service.service';

@Controller('provider/property')
export class PropertyServiceProviderController {
  constructor(private readonly service: PropertyServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Property Management Service',
      actor: 'PROVIDER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
