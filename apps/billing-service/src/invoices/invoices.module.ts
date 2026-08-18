import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { parseRedisUrl } from '@app/common/utils/redis.config';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'CONTRACT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: parseRedisUrl(configService.get<string>('REDIS_BROKER_URL')),
        }),
        inject: [ConfigService],
      },
    ]),
    PaymentsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
