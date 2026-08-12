import { Module } from '@nestjs/common';
import { CustomerPaymentsController } from './payments.controller';
import { CustomerPaymentsService } from './payments.service';

@Module({
  controllers: [CustomerPaymentsController],
  providers: [CustomerPaymentsService],
  exports: [CustomerPaymentsService],
})
export class PaymentsModule {}