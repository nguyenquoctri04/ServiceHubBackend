import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { CustomerServicesController } from './customer.services.controller';
import { CustomerServicesService } from './customer.services.service';
import { ClientsModule, ClientsModuleAsyncOptions } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocationModule } from '../location/location.module';
import { SERVICE_QUEUES, getRabbitMqClientOptions } from '@app/common';

const microserviceQueueMap: Record<string, string> = {
  IDENTITY_SERVICE: SERVICE_QUEUES.IDENTITY,
  CONTRACT_SERVICE: SERVICE_QUEUES.CONTRACT,
};

const clientProviders: ClientsModuleAsyncOptions = Object.entries(microserviceQueueMap).map(
  ([name, queue]) => ({
    name,
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) =>
      getRabbitMqClientOptions(queue, configService.get<string>('RABBITMQ_URL')),
    inject: [ConfigService],
  }),
);

@Module({
  imports: [
    LocationModule,
    ClientsModule.registerAsync(clientProviders),
  ],
  controllers: [ServicesController, CustomerServicesController],
  providers: [ServicesService, CustomerServicesService],
})
export class ServicesModule {}
