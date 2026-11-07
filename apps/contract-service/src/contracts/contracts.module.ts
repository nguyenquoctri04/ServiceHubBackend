import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  ClientsModule,
  ClientsModuleAsyncOptions,
} from "@nestjs/microservices";
import { SERVICE_QUEUES, getRabbitMqClientOptions } from "@app/common";

import { CustomerContractsController } from "./customer.contracts.controller";
import { CustomerContractsService } from "./customer.contracts.service";
import { ProviderContractsController } from "./provider.contracts.controller";
import { ProviderContractsService } from "./provider.contracts.service";
import { ContractPdfRendererService } from "./contract-pdf-renderer.service";
import { ContractRealtimeService } from "./contract-realtime.service";
import { ContractOutboxWorker } from "./contract-outbox.worker";

const microserviceQueueMap: Record<string, string> = {
  IDENTITY_SERVICE: SERVICE_QUEUES.IDENTITY,
  CATALOG_SERVICE: SERVICE_QUEUES.CATALOG,
  NOTIFICATION_SERVICE: SERVICE_QUEUES.NOTIFICATION,
  SIGNATURE_SERVICE: SERVICE_QUEUES.SIGNATURE,
  BILLING_SERVICE: SERVICE_QUEUES.BILLING,
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
  controllers: [
    CustomerContractsController,
    ProviderContractsController,
  ],
  providers: [
    CustomerContractsService,
    ProviderContractsService,
    ContractPdfRendererService,
    ContractRealtimeService,
    ContractOutboxWorker,
  ],
  exports: [ContractPdfRendererService, ContractRealtimeService],
})
export class ContractsModule {}
