import { Module } from '@nestjs/common';
import { CustomerAuditController } from './audit.controller';
import { CustomerAuditService } from './audit.service';

@Module({
  controllers: [CustomerAuditController],
  providers: [CustomerAuditService],
  exports: [CustomerAuditService],
})
export class AuditModule {}