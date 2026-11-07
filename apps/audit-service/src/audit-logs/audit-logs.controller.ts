import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Controller()
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  /**
   * Event pattern — emitted from gateway with HMAC signature and replay protection.
   * Fully intercepted and authenticated by global HmacGuard.
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
