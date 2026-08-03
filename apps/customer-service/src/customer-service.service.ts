import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomerServiceService {
  getServiceInfo(): string {
    return 'Customer Service is operational';
  }
}
