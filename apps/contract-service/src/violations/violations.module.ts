import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { parseRedisUrl } from '@app/common';
import { ViolationsController } from './violations.controller';
import { ViolationsService } from './violations.service';

@Module({
  imports: [ClientsModule.registerAsync([{
    name: 'NOTIFICATION_SERVICE', imports: [ConfigModule],
    useFactory: (config: ConfigService) => ({ transport: Transport.REDIS, options: parseRedisUrl(config.get<string>('REDIS_BROKER_URL')) }),
    inject: [ConfigService],
  }])],
  controllers: [ViolationsController],
  providers: [ViolationsService],
})
export class ViolationsModule {}
