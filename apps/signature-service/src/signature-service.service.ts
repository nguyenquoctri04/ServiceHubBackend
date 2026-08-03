import { Injectable } from '@nestjs/common';

@Injectable()
export class SignatureServiceService {
  getServiceInfo(): string {
    return 'Digital Signature & OTP Service is operational';
  }
}
