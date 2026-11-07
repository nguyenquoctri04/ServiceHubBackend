import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  ClientsModule,
  ClientsModuleAsyncOptions,
} from "@nestjs/microservices";
import { SERVICE_QUEUES, getRabbitMqClientOptions } from "@app/common";
import { GatewayNotificationsController } from "./notifications.controller";
import { GatewayNotificationsService } from "./notifications.service";

const clientProviders: ClientsModuleAsyncOptions = [
  {
    name: "NOTIFICATION_SERVICE",
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) =>
      getRabbitMqClientOptions(
        SERVICE_QUEUES.NOTIFICATION,
        configService.get<string>("RABBITMQ_URL"),
      ),
    inject: [ConfigService],
  },
];

@Module({
  imports: [ClientsModule.registerAsync(clientProviders)],
  controllers: [GatewayNotificationsController],
  providers: [GatewayNotificationsService],
})
export class GatewayNotificationsModule {}
