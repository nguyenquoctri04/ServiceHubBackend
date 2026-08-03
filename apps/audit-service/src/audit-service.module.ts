import { Module } from '@nestjs/common';
import { AuditServiceService } from './audit-service.service';

@Module({
  providers: [AuditServiceService],
  exports: [AuditServiceService],
})
export class AuditServiceModule {}
