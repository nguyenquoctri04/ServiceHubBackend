import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, ClientsModuleAsyncOptions } from '@nestjs/microservices';
import { SERVICE_QUEUES, getRabbitMqClientOptions } from '@app/common';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';

const clientProviders: ClientsModuleAsyncOptions = [
    {
        name: "IDENTITY_SERVICE",
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
            getRabbitMqClientOptions(
                SERVICE_QUEUES.IDENTITY,
                configService.get<string>("RABBITMQ_URL"),
            ),
        inject: [ConfigService],
    },
];

@Module({
  imports: [ClientsModule.registerAsync(clientProviders)],
  controllers: [KeysController],
  providers: [KeysService],
  exports: [KeysService],
})
export class KeysModule {}
