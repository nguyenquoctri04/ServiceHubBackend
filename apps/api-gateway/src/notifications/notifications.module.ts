import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  ClientsModule,
  ClientsModuleAsyncOptions,
  Transport,
} from "@nestjs/microservices";
import { parseRedisUrl } from "@app/common";
import { GatewayNotificationsController } from "./notifications.controller";
import { GatewayNotificationsService } from "./notifications.service";

const clientProviders: ClientsModuleAsyncOptions = [
  {
    name: "NOTIFICATION_SERVICE",
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.REDIS,
      options: parseRedisUrl(configService.get<string>("REDIS_BROKER_URL")),
    }),
    inject: [ConfigService],
  },
];

@Module({
  imports: [ClientsModule.registerAsync(clientProviders)],
  controllers: [GatewayNotificationsController],
  providers: [GatewayNotificationsService],
})
export class GatewayNotificationsModule {}
