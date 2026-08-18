import { Inject, Injectable, HttpException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SecureRpcService } from '@app/common';
import { AuditPatterns } from '@app/common/constants/audit.patterns';
import { AdminQueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AdminAuditService {
  constructor(
    @Inject('AUDIT_SERVICE')
    private readonly auditClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
  ) {}

  async getLogs(dto: AdminQueryAuditLogDto) {
    try {
      return await this.secureRpc.send(
        this.auditClient,
        { cmd: AuditPatterns.GET_LOGS },
        dto,
      );
    } catch (err: any) {
      const msg    = err?.message || 'Lỗi lấy audit logs';
      const status = typeof err?.statusCode === 'number' ? err.statusCode
                   : typeof err?.status    === 'number' ? err.status : 500;
      throw new HttpException(msg, status);
    }
  }
}
