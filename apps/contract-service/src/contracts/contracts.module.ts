import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { CustomerContractsController } from './customer.contracts.controller';
import { CustomerContractsService } from './customer.contracts.service';

@Module({
  controllers: [ContractsController, CustomerContractsController],
  providers: [ContractsService, CustomerContractsService],
})
export class ContractsModule {}
