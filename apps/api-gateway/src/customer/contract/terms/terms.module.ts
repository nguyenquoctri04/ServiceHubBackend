import { Module } from '@nestjs/common';
import { CustomerTermsController } from './terms.controller';
import { CustomerTermsService } from './terms.service';

@Module({
  controllers: [CustomerTermsController],
  providers: [CustomerTermsService],
  exports: [CustomerTermsService],
})
export class TermsModule {}