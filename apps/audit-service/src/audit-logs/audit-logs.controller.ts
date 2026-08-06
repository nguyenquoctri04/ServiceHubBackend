import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuditLogsService } from './audit-logs.service';

@Controller()
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @MessagePattern({ cmd: 'audit.log' })
  async handleAuditLog(@Payload() data: any) {
    return this.service.createLog(data);
  }
}
