import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum AuditActionFilter {
  LOGIN             = 'LOGIN',
  LOGIN_FAILED      = 'LOGIN_FAILED',
  LOGOUT            = 'LOGOUT',
  CREATE            = 'CREATE',
  UPDATE            = 'UPDATE',
  DELETE            = 'DELETE',
  APPROVE           = 'APPROVE',
  REJECT            = 'REJECT',
  CREATE_CONTRACT   = 'CREATE_CONTRACT',
  UPDATE_CONTRACT   = 'UPDATE_CONTRACT',
  TERMINATE_CONTRACT= 'TERMINATE_CONTRACT',
  SIGN_CONTRACT     = 'SIGN_CONTRACT',
  CREATE_INVOICE    = 'CREATE_INVOICE',
  UPDATE_INVOICE    = 'UPDATE_INVOICE',
  PAY_INVOICE       = 'PAY_INVOICE',
  CREATE_PROVIDER   = 'CREATE_PROVIDER',
  UPDATE_PROVIDER   = 'UPDATE_PROVIDER',
  CREATE_PROPERTY   = 'CREATE_PROPERTY',
  UPDATE_PROPERTY   = 'UPDATE_PROPERTY',
  DELETE_PROPERTY   = 'DELETE_PROPERTY',
  CREATE_ROOM       = 'CREATE_ROOM',
  UPDATE_ROOM       = 'UPDATE_ROOM',
  DELETE_ROOM       = 'DELETE_ROOM',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  CREATE_VIOLATION  = 'CREATE_VIOLATION',
  RESOLVE_VIOLATION = 'RESOLVE_VIOLATION',
  RESTRICT_CUSTOMER = 'RESTRICT_CUSTOMER',
  CREATE_APPEAL     = 'CREATE_APPEAL',
  REVIEW_APPEAL     = 'REVIEW_APPEAL',
  SWITCH_PROVIDER_PROFILE = 'SWITCH_PROVIDER_PROFILE',
  EKYC_VERIFIED     = 'EKYC_VERIFIED',
  OTHER             = 'OTHER',
}

export class AdminQueryAuditLogDto {
  @IsInt() @Min(1) @Type(() => Number) @IsOptional()
  page?: number = 1;

  @IsInt() @Min(1) @Max(100) @Type(() => Number) @IsOptional()
  limit?: number = 20;

  @IsUUID() @IsOptional()
  userId?: string;

  @IsString() @IsOptional()
  serviceName?: string;

  @IsEnum(AuditActionFilter) @IsOptional()
  action?: AuditActionFilter;

  @IsString() @IsOptional()
  entityType?: string;

  @IsString() @IsOptional()
  from?: string;

  @IsString() @IsOptional()
  to?: string;

  @IsString() @IsOptional()
  search?: string;
}
