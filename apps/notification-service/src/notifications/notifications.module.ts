import { parseRedisUrl } from '@app/common';
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { CustomerNotificationsController } from './customer.notifications.controller';
import { CustomerNotificationsService } from './customer.notifications.service';
import { ClientsModule, ClientsModuleAsyncOptions, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

const clientProviders: ClientsModuleAsyncOptions = [
  {
    name: "IDENTITY_SERVICE",
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.REDIS,
      options: parseRedisUrl(configService.get<string>("REDIS_BROKER_URL")),
    }),
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
  controllers: [NotificationsController, CustomerNotificationsController],
  providers: [NotificationsService, CustomerNotificationsService],
})
export class NotificationsModule {}