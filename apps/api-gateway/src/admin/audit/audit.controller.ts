import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { AdminAuditService } from './audit.service';
import { AdminQueryAuditLogDto } from './dto/query-audit-log.dto';

@Controller('api/admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAuditController {
  constructor(private readonly service: AdminAuditService) {}

  /** GET /api/admin/audit-logs — query with filters & pagination */
  @Get()
  getLogs(@Query() dto: AdminQueryAuditLogDto) {
    return this.service.getLogs(dto);
  }
}
