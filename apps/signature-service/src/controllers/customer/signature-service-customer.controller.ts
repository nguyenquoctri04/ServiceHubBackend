import { Controller, Get } from '@nestjs/common';
import { SignatureServiceService } from '../../signature-service.service';

@Controller('customer/signature')
export class SignatureServiceCustomerController {
  constructor(private readonly service: SignatureServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Digital Signature Service',
      actor: 'CUSTOMER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
