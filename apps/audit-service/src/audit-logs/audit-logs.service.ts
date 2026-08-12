import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLog(data: any) {
    this.logger.log(`Received audit log request: ${data.action}`);
    
    // 5. Audit Service writes to its own Database via Prisma
    const log = await this.prisma.auditLog.create({
      data: {
        action: data.action || 'OTHER',
        entityType: 'SYSTEM',
        userId: data.userId || null, // Must be UUID or null
        description: data.description, // Replaced details with description
        createdAt: new Date(),
      }
    });

    return { success: true, logId: log.id };
  }
}
