import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuditPatterns } from '@app/common/constants/audit.patterns';

export interface EmitAuditPayload {
  userId?:      string;
  serviceName?: string;
  action:       string;
  entityType:   string;
  entityId?:    string;
  oldData?:     Record<string, any>;
  newData?:     Record<string, any>;
  ipAddress?:   string;
  userAgent?:   string;
  description?: string;
}

/**
 * Thin wrapper around AUDIT_SERVICE client.
 * Uses .emit() (fire-and-forget) so it never blocks the main request.
 */
@Injectable()
export class AuditEmitterService {
  private readonly logger = new Logger(AuditEmitterService.name);

  constructor(
    @Inject('AUDIT_SERVICE')
    private readonly auditClient: ClientProxy,
  ) {}

  emit(payload: EmitAuditPayload): void {
    try {
      // Use plain string pattern to match @EventPattern('audit.log') on audit-service.
      // .emit() is fire-and-forget and does NOT go through HmacGuard (EventPattern context).
      this.auditClient.emit('audit.log', payload);
    } catch (err: any) {
      // Never let audit errors bubble up to the caller
      this.logger.error(`Failed to emit audit event: ${err?.message}`, err?.stack);
    }
  }
}
