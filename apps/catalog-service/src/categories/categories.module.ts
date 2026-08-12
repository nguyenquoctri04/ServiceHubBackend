import { Module } from "@nestjs/common";
import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import { CustomerCategoriesController } from "./customer.categories.controller";
import { CustomerCategoriesService } from "./customer.categories.service";
import {
  ClientsModule,
  ClientsModuleAsyncOptions,
  Transport,
} from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { parseRedisUrl } from "@app/common";

const microservices = ["IDENTITY_SERVICE", "CONTRACT_SERVICE"];

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

@Module({
  imports: [ClientsModule.registerAsync(clientProviders)],
  controllers: [CategoriesController, CustomerCategoriesController],
  providers: [CategoriesService, CustomerCategoriesService],
})
export class CategoriesModule {}
