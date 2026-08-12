import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { CustomerServicesController } from './customer.services.controller';
import { CustomerServicesService } from './customer.services.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [
    LocationModule,
    ClientsModule.registerAsync([
      {
        name: 'IDENTITY_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get('REDIS_BROKER_URL')?.split(':')[0] || 'localhost',
            port: parseInt(configService.get('REDIS_BROKER_URL')?.split(':')[1] || '6379', 10),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ServicesController, CustomerServicesController],
  providers: [ServicesService, CustomerServicesService],
})
export class ServicesModule {}
