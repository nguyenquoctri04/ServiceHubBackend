import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { SERVICE_QUEUES, getRabbitMqClientOptions } from '@app/common';
import { ViolationsController } from './violations.controller';
import { ViolationsService } from './violations.service';
import { CustomerViolationsController } from './customer.violations.controller';
import { CustomerViolationsService } from './customer.violations.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          getRabbitMqClientOptions(
            SERVICE_QUEUES.NOTIFICATION,
            configService.get<string>('RABBITMQ_URL'),
          ),
        inject: [ConfigService],
      },
      {
        name: 'CATALOG_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          getRabbitMqClientOptions(
            SERVICE_QUEUES.CATALOG,
            configService.get<string>('RABBITMQ_URL'),
          ),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ViolationsController, CustomerViolationsController],
  providers: [ViolationsService, CustomerViolationsService],
})
export class ViolationsModule {}
