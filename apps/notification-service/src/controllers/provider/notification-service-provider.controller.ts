import { Controller, Get } from '@nestjs/common';
import { NotificationServiceService } from '../../notification-service.service';

@Controller('provider/notification')
export class NotificationServiceProviderController {
  constructor(private readonly service: NotificationServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Notification Service',
      actor: 'PROVIDER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
