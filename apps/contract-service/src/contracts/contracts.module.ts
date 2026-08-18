import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { parseRedisUrl } from '@app/common';

import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { CustomerContractsController } from './customer.contracts.controller';
import { CustomerContractsService } from './customer.contracts.service';
import { ProviderContractsController } from './provider.contracts.controller';
import { ProviderContractsService } from './provider.contracts.service';

const microservices = ['IDENTITY_SERVICE', 'CATALOG_SERVICE', 'NOTIFICATION_SERVICE'];

@Module({
  imports: [
    ClientsModule.registerAsync(
      microservices.map((name) => ({
        name,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: parseRedisUrl(configService.get<string>('REDIS_BROKER_URL')),
        }),
        inject: [ConfigService],
      })),
    ),
  ],
  controllers: [ContractsController, CustomerContractsController, ProviderContractsController],
  providers: [ContractsService, CustomerContractsService, ProviderContractsService],
})
export class ContractsModule {}
