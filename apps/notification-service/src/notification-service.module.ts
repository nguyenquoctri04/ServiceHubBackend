import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommonModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    CommonModule.forRoot({
      serviceName: "NOTIFICATION_SERVICE_NAME",
      secretEnv: "NOTIFICATION_SERVICE_SECRET",
    }),
    PrismaModule,
    NotificationsModule
  ],
  controllers: [],
  providers: [],
})
export class NotificationServiceModule {}
