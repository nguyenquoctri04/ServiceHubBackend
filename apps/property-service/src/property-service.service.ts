import { Injectable } from '@nestjs/common';

@Injectable()
export class PropertyServiceService {
  getServiceInfo(): string {
    return 'Property Management Service is operational';
  }
}
