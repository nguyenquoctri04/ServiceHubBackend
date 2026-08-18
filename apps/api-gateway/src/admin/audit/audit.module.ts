import { Module } from '@nestjs/common';
import { AdminAuditController } from './audit.controller';
import { AdminAuditService } from './audit.service';

@Module({
  controllers: [AdminAuditController],
  providers:   [AdminAuditService],
  exports:     [AdminAuditService],
})
export class AdminAuditModule {}
