import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { parseRedisUrl } from '@app/common/utils/redis.config';
import { CustomerInvoicesController } from './customer.invoices.controller';
import { CustomerInvoicesService } from './customer.invoices.service';
import { PaymentsModule } from '../payments/payments.module';
import { PayOSModule } from '../payos/payos.module';

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
      ...(['IDENTITY_SERVICE', 'CATALOG_SERVICE'] as const).map((name) => ({
        name,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS as const,
          options: parseRedisUrl(configService.get<string>('REDIS_BROKER_URL')),
        }),
        inject: [ConfigService],
      })),
    ]),
    PaymentsModule,
    PayOSModule,
  ],
  controllers: [InvoicesController, CustomerInvoicesController],
  providers: [InvoicesService, CustomerInvoicesService],
})
export class InvoicesModule { }
