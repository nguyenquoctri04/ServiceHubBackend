import { Module } from '@nestjs/common';
import { MetersController } from './meters.controller';
import { MetersService } from './meters.service';
import { OcrModule } from '../ocr/ocr.module';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICE_QUEUES, getRabbitMqClientOptions } from '@app/common';

@Module({
  imports: [
    OcrModule,
    ClientsModule.registerAsync([
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
      {
        name: 'CONTRACT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          getRabbitMqClientOptions(
            SERVICE_QUEUES.CONTRACT,
            configService.get<string>('RABBITMQ_URL'),
          ),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [MetersController],
  providers: [MetersService],
})
export class MetersModule {}
