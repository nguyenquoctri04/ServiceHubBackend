import { Injectable } from '@nestjs/common';

@Injectable()
export class BillingServiceService {
  getServiceInfo(): string {
    return 'Billing & Payment Service is operational';
  }
}
