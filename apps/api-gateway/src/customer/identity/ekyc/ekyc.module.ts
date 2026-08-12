import { Module } from '@nestjs/common';
import { CustomerEkycController } from './ekyc.controller';
import { CustomerEkycService } from './ekyc.service';

@Module({
  controllers: [CustomerEkycController],
  providers: [CustomerEkycService],
  exports: [CustomerEkycService],
})
export class EkycModule {}