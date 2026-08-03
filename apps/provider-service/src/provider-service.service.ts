import { Injectable } from '@nestjs/common';

@Injectable()
export class ProviderServiceService {
  getServiceInfo(): string {
    return 'Provider Service is operational';
  }
}
