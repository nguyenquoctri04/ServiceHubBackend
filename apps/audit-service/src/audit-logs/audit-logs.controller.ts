import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Controller()
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  /**
   * Fire-and-forget event — emitted from gateway with .emit(), no HMAC envelope.
   * Uses @EventPattern so HmacGuard does not apply (guard only intercepts RPC context).
   */
  @EventPattern('audit.log')
  async handleAuditEvent(@Payload() data: CreateAuditLogDto) {
    // Intentionally non-blocking — swallow errors so audit never crashes callers
    this.service.createLog(data).catch(() => {});
  }

  /** RPC query — called by admin gateway via secureRpc.send(), HMAC-protected */
  @MessagePattern({ cmd: 'audit.getLogs' })
  async handleGetLogs(@Payload() dto: QueryAuditLogDto) {
    return this.service.getLogs(dto);
  }
}
