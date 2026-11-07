import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommonModule, HmacGuard } from '@app/common';
import { APP_GUARD } from '@nestjs/core';

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
  providers: [
    {
      provide: APP_GUARD,
      useExisting: HmacGuard,
    },
  ],
})
export class NotificationServiceModule {}
