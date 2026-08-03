import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditServiceService {
  getServiceInfo(): string {
    return 'Audit Log Service is operational';
  }
}
