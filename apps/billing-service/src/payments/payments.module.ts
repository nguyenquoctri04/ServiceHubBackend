import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CustomerPaymentsController } from './customer.payments.controller';
import { CustomerPaymentsService } from './customer.payments.service';
import { PayOSModule } from '../payos/payos.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { parseRedisUrl } from '@app/common';

@Module({
  imports: [
    ConfigModule,
    PayOSModule,
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS as const,
          options: parseRedisUrl(configService.get<string>('REDIS_BROKER_URL')),
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [PaymentsController, CustomerPaymentsController],
  providers: [PaymentsService, CustomerPaymentsService],
  exports: [PaymentsService, CustomerPaymentsService],
})
export class PaymentsModule {}
