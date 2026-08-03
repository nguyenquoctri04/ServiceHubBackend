import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationServiceService {
  getServiceInfo(): string {
    return 'Notification Service is operational';
  }
}
