import { Injectable } from '@nestjs/common';

@Injectable()
export class ContractServiceService {
  getServiceInfo(): string {
    return 'Contract Management Service is operational';
  }
}
