import { Module } from '@nestjs/common';
import { CustomerContractsController } from './contracts.controller';
import { CustomerContractsService } from './contracts.service';

@Module({
  controllers: [CustomerContractsController],
  providers: [CustomerContractsService],
  exports: [CustomerContractsService],
})
export class ContractsModule {}