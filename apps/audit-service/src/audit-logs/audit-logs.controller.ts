import { Controller } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';

@Controller()
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}
}
