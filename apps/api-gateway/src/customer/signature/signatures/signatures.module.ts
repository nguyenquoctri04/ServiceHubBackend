import { Module } from '@nestjs/common';
import { CustomerSignaturesController } from './signatures.controller';
import { CustomerSignaturesService } from './signatures.service';

@Module({
  controllers: [CustomerSignaturesController],
  providers: [CustomerSignaturesService],
  exports: [CustomerSignaturesService],
})
export class SignaturesModule {}