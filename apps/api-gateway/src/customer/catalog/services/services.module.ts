import { Module } from '@nestjs/common';
import { CustomerServicesController } from './services.controller';
import { CustomerServicesService } from './services.service';

@Module({
  controllers: [CustomerServicesController],
  providers: [CustomerServicesService],
  exports: [CustomerServicesService],
})
export class ServicesModule {}