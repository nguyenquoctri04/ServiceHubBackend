import { Module } from '@nestjs/common';
import { ViolationsController } from './violations.controller';
import { ViolationsService } from './violations.service';
import { CustomerViolationsController } from './customer.violations.controller';
import { CustomerViolationsService } from './customer.violations.service';

@Module({
  controllers: [ViolationsController, CustomerViolationsController],
  providers: [ViolationsService, CustomerViolationsService],
})
export class ViolationsModule {}
