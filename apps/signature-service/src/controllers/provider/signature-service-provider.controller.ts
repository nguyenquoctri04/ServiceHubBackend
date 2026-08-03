import { Controller, Get } from '@nestjs/common';
import { SignatureServiceService } from '../../signature-service.service';

@Controller('provider/signature')
export class SignatureServiceProviderController {
  constructor(private readonly service: SignatureServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Digital Signature Service',
      actor: 'PROVIDER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
