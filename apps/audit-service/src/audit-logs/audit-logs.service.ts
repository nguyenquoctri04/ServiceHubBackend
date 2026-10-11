import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, Prisma } from '@prisma/client-audit';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLog(data: CreateAuditLogDto) {
    this.logger.log(`Received audit log: action=${data.action} entity=${data.entityType} user=${data.userId ?? 'system'}`);

    const log = await this.prisma.auditLog.create({
      data: {
        userId:      data.userId      ?? null,
        serviceName: data.serviceName ?? null,
        action:      (data.action as AuditAction) ?? AuditAction.OTHER,
        entityType:  data.entityType  ?? 'SYSTEM',
        entityId:    data.entityId    ?? null,
        oldData:     data.oldData     ?? null,
        newData:     data.newData     ?? null,
        ipAddress:   data.ipAddress   ?? null,
        userAgent:   data.userAgent   ?? null,
        description: data.description ?? null,
        createdAt:   new Date(),
      },
    });

    return { success: true, logId: log.id };
  }

  async getLogs(dto: QueryAuditLogDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (dto.userId)      where.userId      = dto.userId;
    if (dto.serviceName) where.serviceName = dto.serviceName;
    if (dto.action)      where.action      = dto.action as AuditAction;
    if (dto.entityType)  where.entityType  = dto.entityType;

    if (dto.from || dto.to) {
      where.createdAt = {};
      if (dto.from) where.createdAt.gte = new Date(dto.from);
      if (dto.to)   where.createdAt.lte = new Date(dto.to);
    }

    if (dto.search) {
      where.OR = [
        { description: { contains: dto.search, mode: 'insensitive' } },
        { ipAddress:   { contains: dto.search, mode: 'insensitive' } },
        { entityType:  { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
