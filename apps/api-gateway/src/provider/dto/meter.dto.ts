import { IsOptional, IsString, IsNumberString, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MeterQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class GroupedMeterQueryDto {
  @IsUUID('loose')
  propertyId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;
}

export class DashboardRoomsQueryDto {
  // PostgreSQL UUID columns do not require a specific RFC UUID version. Keep the
  // full UUID shape validation while accepting existing, versionless seed IDs.
  @IsUUID('loose') @IsOptional()
  propertyId?: string;
}

export class ExcelRowPreviewDto {
  @IsOptional()
  @IsString()
  meterId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  value?: any;
}

export class ExcelImportPreviewDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExcelRowPreviewDto)
  rows: ExcelRowPreviewDto[];
}
