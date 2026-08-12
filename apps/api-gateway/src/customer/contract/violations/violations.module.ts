import { Module } from '@nestjs/common';
import { CustomerViolationsController } from './violations.controller';
import { CustomerViolationsService } from './violations.service';

@Module({
  controllers: [CustomerViolationsController],
  providers: [CustomerViolationsService],
  exports: [CustomerViolationsService],
})
export class ViolationsModule {}