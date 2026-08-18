import { Module } from '@nestjs/common';
import { AdminAuditModule } from './audit/audit.module';

@Module({
  imports: [AdminAuditModule],
})
export class AdminModule {}
