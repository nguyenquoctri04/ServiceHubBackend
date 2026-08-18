import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction } from '@prisma/client-audit';

export class QueryAuditLogDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  serviceName?: string;

  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @IsString()
  @IsOptional()
  entityType?: string;

  /** ISO date string — filter logs from this date */
  @IsString()
  @IsOptional()
  from?: string;

  /** ISO date string — filter logs to this date */
  @IsString()
  @IsOptional()
  to?: string;

  /** Free-text search on description or ipAddress */
  @IsString()
  @IsOptional()
  search?: string;
}
