import { Controller, Get } from '@nestjs/common';
import { NotificationServiceService } from '../../notification-service.service';

@Controller('customer/notification')
export class NotificationServiceCustomerController {
  constructor(private readonly service: NotificationServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Notification Service',
      actor: 'CUSTOMER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
