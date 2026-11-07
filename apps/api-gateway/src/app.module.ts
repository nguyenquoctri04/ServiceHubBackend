import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  ClientsModule,
  Transport,
  ClientsModuleAsyncOptions,
} from "@nestjs/microservices";
import { ThrottlerGuard } from "@nestjs/throttler";
import {
  CommonModule,
  RateLimitModule,
  SERVICE_QUEUES,
  getRabbitMqClientOptions,
} from "@app/common";
import { AuthModule } from "./auth/auth.module";
import { ProxyModule } from "./proxy/proxy.module";
import { ProviderModule } from "./provider/provider.module";
import { CustomerModule } from "./customer/customer.module";
import { MediaModule } from "./media/media.module";
import { GatewayNotificationsModule } from "./notifications/notifications.module";
import { AdminModule } from "./admin/admin.module";
import { SharedModule } from "./shared/shared.module";

const microserviceQueueMap: Record<string, string> = {
  IDENTITY_SERVICE: SERVICE_QUEUES.IDENTITY,
  CATALOG_SERVICE: SERVICE_QUEUES.CATALOG,
  CONTRACT_SERVICE: SERVICE_QUEUES.CONTRACT,
  SIGNATURE_SERVICE: SERVICE_QUEUES.SIGNATURE,
  BILLING_SERVICE: SERVICE_QUEUES.BILLING,
  NOTIFICATION_SERVICE: SERVICE_QUEUES.NOTIFICATION,
  AUDIT_SERVICE: SERVICE_QUEUES.AUDIT,
};

const clientProviders: ClientsModuleAsyncOptions = Object.entries(microserviceQueueMap).map(
  ([name, queue]) => ({
    name,
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) =>
      getRabbitMqClientOptions(queue, configService.get<string>("RABBITMQ_URL")),
    inject: [ConfigService],
  }),
);

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env", // Monorepo structure, .env is in root
    }),
    ClientsModule.registerAsync(clientProviders),
    CommonModule.forRoot({
      serviceName: "API_GATEWAY_NAME",
      secretEnv: "API_GATEWAY_SECRET",
    }),
    RateLimitModule,
    SharedModule,
    ProxyModule,
    AuthModule,
    ProviderModule,
    CustomerModule,
    AdminModule,
    MediaModule,
    GatewayNotificationsModule,
  ],
  controllers: [],
  providers: [
    // Áp rate limit cho MỌI route của api-gateway (điểm vào HTTP duy nhất
    // của hệ thống). Route nào cần limit riêng (vd auth) dùng @Throttle().
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ClientsModule, ProxyModule],
})
export class AppModule {}
