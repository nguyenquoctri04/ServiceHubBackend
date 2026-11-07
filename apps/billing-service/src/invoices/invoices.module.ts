import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICE_QUEUES, getRabbitMqClientOptions } from '@app/common';
import { CustomerInvoicesController } from './customer.invoices.controller';
import { CustomerInvoicesService } from './customer.invoices.service';
import { PaymentsModule } from '../payments/payments.module';
import { PayOSModule } from '../payos/payos.module';
import { BillingOutboxWorker } from './billing-outbox.worker';
import { BillingMaintenanceWorker } from './billing-maintenance.worker';

const clientQueues: Record<string, string> = {
  CONTRACT_SERVICE: SERVICE_QUEUES.CONTRACT,
  IDENTITY_SERVICE: SERVICE_QUEUES.IDENTITY,
  CATALOG_SERVICE: SERVICE_QUEUES.CATALOG,
};

@Module({
  imports: [
    ClientsModule.registerAsync(
      Object.entries(clientQueues).map(([name, queue]) => ({
        name,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          getRabbitMqClientOptions(queue, configService.get<string>('RABBITMQ_URL')),
        inject: [ConfigService],
      })),
    ),
    PaymentsModule,
    PayOSModule,
  ],
  controllers: [InvoicesController, CustomerInvoicesController],
  providers: [InvoicesService, CustomerInvoicesService, BillingOutboxWorker, BillingMaintenanceWorker],
})
export class InvoicesModule { }
