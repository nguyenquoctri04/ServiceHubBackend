import { Module } from '@nestjs/common';
import { SignaturesController } from './signatures.controller';
import { SignaturesService } from './signatures.service';
import { ClientsModule, ClientsModuleAsyncOptions, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { parseRedisUrl } from '@app/common';
import { KeysModule } from '../keys/keys.module';

const microservices = ["CONTRACT_SERVICE"];

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
      ClientsModule.registerAsync(clientProviders),
      KeysModule
    ],
  controllers: [SignaturesController],
  providers: [SignaturesService],
})
export class SignaturesModule {}
