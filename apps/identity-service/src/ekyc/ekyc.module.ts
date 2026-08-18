import { Module } from '@nestjs/common';
import { EkycController } from './ekyc.controller';
import { EkycService } from './ekyc.service';
import { VnptEkycService } from './vnpt-ekyc.service';

@Module({
  controllers: [EkycController],
  providers: [EkycService, VnptEkycService],
  exports: [EkycService, VnptEkycService],
})
export class EkycModule {}
