import { Injectable } from '@nestjs/common';

@Injectable()
export class IdentityServiceService {
  getServiceInfo(): string {
    return 'Identity & eKYC Service is operational';
  }
}
