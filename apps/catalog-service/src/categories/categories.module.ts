import { Module } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CustomerCategoriesController } from "./customer.categories.controller";
import { CustomerCategoriesService } from "./customer.categories.service";
import {
  ClientsModule,
  ClientsModuleAsyncOptions,
} from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SERVICE_QUEUES, getRabbitMqClientOptions } from "@app/common";

const microserviceQueueMap: Record<string, string> = {
  IDENTITY_SERVICE: SERVICE_QUEUES.IDENTITY,
  CONTRACT_SERVICE: SERVICE_QUEUES.CONTRACT,
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

@Module({
  imports: [ClientsModule.registerAsync(clientProviders)],
  controllers: [CustomerCategoriesController],
  providers: [CategoriesService, CustomerCategoriesService],
})
export class CategoriesModule { }
