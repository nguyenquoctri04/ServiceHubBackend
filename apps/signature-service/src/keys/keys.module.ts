import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, ClientsModuleAsyncOptions, Transport } from '@nestjs/microservices';
import { parseRedisUrl } from '@app/common';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';

const clientProviders: ClientsModuleAsyncOptions = [
    {
        name: "IDENTITY_SERVICE",
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
            transport: Transport.REDIS,
            options: parseRedisUrl(configService.get<string>("REDIS_BROKER_URL")),
        }),
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
