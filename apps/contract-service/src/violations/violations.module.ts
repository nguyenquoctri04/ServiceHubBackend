import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { parseRedisUrl } from '@app/common';
import { ViolationsController } from './violations.controller';
import { ViolationsService } from './violations.service';
import { CustomerViolationsController } from './customer.violations.controller';
import { CustomerViolationsService } from './customer.violations.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: parseRedisUrl(configService.get<string>('REDIS_BROKER_URL')),
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ViolationsController, CustomerViolationsController],
  providers: [ViolationsService, CustomerViolationsService],
})
export class ViolationsModule {}
