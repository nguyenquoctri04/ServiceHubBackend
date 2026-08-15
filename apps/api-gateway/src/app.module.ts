import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  ClientsModule,
  Transport,
  ClientsModuleAsyncOptions,
} from "@nestjs/microservices";

import { CommonModule, parseRedisUrl } from "@app/common";
import { AuthModule } from "./auth/auth.module";
import { ProxyModule } from "./proxy/proxy.module";
import { ProviderModule } from "./provider/provider.module";
import { CustomerModule } from "./customer/customer.module";

const microservices = [
  "IDENTITY_SERVICE",
  "CATALOG_SERVICE",
  "CONTRACT_SERVICE",
  "SIGNATURE_SERVICE",
  "BILLING_SERVICE",
  "NOTIFICATION_SERVICE",
  "AUDIT_SERVICE",
];

const clientProviders: ClientsModuleAsyncOptions = microservices.map(
  (name) => ({
    name,
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.REDIS,
      options: parseRedisUrl(configService.get<string>("REDIS_BROKER_URL")),
    }),
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
    ProxyModule,
    AuthModule,
    ProviderModule,
    CustomerModule,
  ],
  controllers: [],
  providers: [],
  exports: [ClientsModule, ProxyModule],
})
export class AppModule {}
