import { Controller, Get } from '@nestjs/common';
import { SignatureServiceService } from '../../signature-service.service';

@Controller('admin/signature')
export class SignatureServiceAdminController {
  constructor(private readonly service: SignatureServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Digital Signature Service',
      actor: 'ADMIN',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
