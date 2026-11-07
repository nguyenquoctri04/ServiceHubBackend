import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SecureRpcService } from '@app/common';
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
 * Uses .emit() with HMAC signature & replay protection so it never blocks the main request
 * while guaranteeing zero-trust cryptographic authenticity.
 */
@Injectable()
export class AuditEmitterService {
  private readonly logger = new Logger(AuditEmitterService.name);

  constructor(
    @Inject('AUDIT_SERVICE')
    private readonly auditClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
  ) {}

  emit(payload: EmitAuditPayload): void {
    try {
      // Use HMAC-signed emit via SecureRpcService
      this.secureRpc.emit(this.auditClient, 'audit.log', payload);
    } catch (err: any) {
      // Never let audit errors bubble up to the caller
      this.logger.error(`Failed to emit audit event: ${err?.message}`, err?.stack);
    }
  }
}
