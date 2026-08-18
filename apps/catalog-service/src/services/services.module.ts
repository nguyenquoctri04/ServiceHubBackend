import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { CustomerServicesController } from './customer.services.controller';
import { CustomerServicesService } from './customer.services.service';
import { ClientsModule, ClientsModuleAsyncOptions, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocationModule } from '../location/location.module';
import { parseRedisUrl } from '@app/common';

const microservices = ["IDENTITY_SERVICE", "CONTRACT_SERVICE"];

const clientProviders: ClientsModuleAsyncOptions = microservices.map(
  (name) => ({
    name,
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.REDIS,
      options: parseRedisUrl(configService.get<string>("REDIS_BROKER_URL")),
    }),
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
