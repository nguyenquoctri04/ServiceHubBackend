import { Module } from '@nestjs/common';
import { CustomerInvoicesController } from './invoices.controller';
import { CustomerInvoicesService } from './invoices.service';

@Module({
  controllers: [CustomerInvoicesController],
  providers: [CustomerInvoicesService],
  exports: [CustomerInvoicesService],
})
export class InvoicesModule {}