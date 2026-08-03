import { Module } from '@nestjs/common';
import { NotificationServiceService } from './notification-service.service';
import { NotificationServiceAdminController } from './controllers/admin/notification-service-admin.controller';
import { NotificationServiceCustomerController } from './controllers/customer/notification-service-customer.controller';
import { NotificationServiceProviderController } from './controllers/provider/notification-service-provider.controller';

@Module({
  controllers: [
    NotificationServiceAdminController,
    NotificationServiceCustomerController,
    NotificationServiceProviderController,
  ],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
