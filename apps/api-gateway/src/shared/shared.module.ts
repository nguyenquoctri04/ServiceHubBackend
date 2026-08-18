import { Global, Module } from '@nestjs/common';
import { AuditEmitterService } from './audit-emitter.service';

/**
 * Shared utilities available to every gateway module.
 * Marked @Global so no explicit import needed in feature modules.
 */
@Global()
@Module({
  providers: [AuditEmitterService],
  exports:   [AuditEmitterService],
})
export class SharedModule {}
