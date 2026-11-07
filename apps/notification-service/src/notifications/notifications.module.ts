import { SERVICE_QUEUES, getRabbitMqClientOptions } from '@app/common';
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { CustomerNotificationsController } from './customer.notifications.controller';
import { CustomerNotificationsService } from './customer.notifications.service';
import { ProviderNotificationsController } from './provider.notifications.controller';
import { ProviderNotificationsService } from './provider.notifications.service';
import { ClientsModule, ClientsModuleAsyncOptions } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { NotificationsGateway } from './notifications.gateway';

const clientProviders: ClientsModuleAsyncOptions = [
  {
    name: "IDENTITY_SERVICE",
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) =>
      getRabbitMqClientOptions(
        SERVICE_QUEUES.IDENTITY,
        configService.get<string>("RABBITMQ_URL"),
      ),
    inject: [ConfigService],
  },
];

@Module({
  imports: [
    ClientsModule.registerAsync(clientProviders),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    NotificationsController,
    CustomerNotificationsController,
    ProviderNotificationsController,
  ],
  providers: [
    NotificationsService,
    CustomerNotificationsService,
    ProviderNotificationsService,
    NotificationsGateway,
  ],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}