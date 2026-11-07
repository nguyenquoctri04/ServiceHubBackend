import { Module } from '@nestjs/common';
import { SignaturesController } from './signatures.controller';
import { SignaturesService } from './signatures.service';
import { ClientsModule, ClientsModuleAsyncOptions } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICE_QUEUES, getRabbitMqClientOptions } from '@app/common';
import { KeysModule } from '../keys/keys.module';

const clientProviders: ClientsModuleAsyncOptions = [
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
];

@Module({
  imports: [
      ClientsModule.registerAsync(clientProviders),
      KeysModule
    ],
  controllers: [SignaturesController],
  providers: [SignaturesService],
})
export class SignaturesModule {}
