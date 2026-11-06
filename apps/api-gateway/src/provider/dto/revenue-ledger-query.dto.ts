import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RevenueLedgerQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @IsOptional()
  @IsIn(['INCOME', 'PAYOUT', 'REFUND'])
  type?: 'INCOME' | 'PAYOUT' | 'REFUND';

  @IsOptional()
  @IsIn(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'CANCELLED'])
  status?: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN' | 'CANCELLED';

  @IsOptional()
  @IsString()
  search?: string;
}
