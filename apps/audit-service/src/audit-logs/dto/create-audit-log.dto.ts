import { IsEnum, IsIP, IsOptional, IsString, IsUUID } from 'class-validator';
import { AuditAction } from '@prisma/client-audit';

export class CreateAuditLogDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  serviceName?: string;

  @IsEnum(AuditAction)
  action: AuditAction;

  @IsString()
  entityType: string;

  @IsUUID()
  @IsOptional()
  entityId?: string;

  @IsOptional()
  oldData?: Record<string, any>;

  @IsOptional()
  newData?: Record<string, any>;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
