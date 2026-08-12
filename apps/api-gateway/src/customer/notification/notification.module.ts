import { Module } from '@nestjs/common';
import { CustomerNotificationController } from './notification.controller';
import { CustomerNotificationService } from './notification.service';

@Module({
  controllers: [CustomerNotificationController],
  providers: [CustomerNotificationService],
  exports: [CustomerNotificationService],
})
export class NotificationModule {}