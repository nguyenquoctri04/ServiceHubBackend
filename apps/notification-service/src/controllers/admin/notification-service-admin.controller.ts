import { Controller, Get } from '@nestjs/common';
import { NotificationServiceService } from '../../notification-service.service';

@Controller('admin/notification')
export class NotificationServiceAdminController {
  constructor(private readonly service: NotificationServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Notification Service',
      actor: 'ADMIN',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
