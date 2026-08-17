import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../pagination.dto';

export enum InvoiceStatusQuery {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export class InvoiceQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InvoiceStatusQuery)
  status?: InvoiceStatusQuery;

  @IsOptional()
  @IsString()
  search?: string;
}
