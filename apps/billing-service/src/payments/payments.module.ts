import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CustomerPaymentsController } from './customer.payments.controller';
import { CustomerPaymentsService } from './customer.payments.service';
import { PayOSModule } from '../payos/payos.module';
import { ClientsModule } from '@nestjs/microservices';
import { SERVICE_QUEUES, getRabbitMqClientOptions } from '@app/common';

@Module({
  imports: [
    ConfigModule,
    PayOSModule,
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
    ]),
  ],
  controllers: [PaymentsController, CustomerPaymentsController],
  providers: [PaymentsService, CustomerPaymentsService],
  exports: [PaymentsService, CustomerPaymentsService],
})
export class PaymentsModule {}
