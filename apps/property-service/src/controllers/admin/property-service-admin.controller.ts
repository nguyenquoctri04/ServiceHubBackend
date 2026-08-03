import { Controller, Get } from '@nestjs/common';
import { PropertyServiceService } from '../../property-service.service';

@Controller('admin/property')
export class PropertyServiceAdminController {
  constructor(private readonly service: PropertyServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Property Management Service',
      actor: 'ADMIN',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
