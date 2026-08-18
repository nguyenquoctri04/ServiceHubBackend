import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { CustomerNotificationsController } from './customer.notifications.controller';
import { CustomerNotificationsService } from './customer.notifications.service';

@Module({
  controllers: [NotificationsController, CustomerNotificationsController],
  providers: [NotificationsService, CustomerNotificationsService],
})
export class NotificationsModule {}
