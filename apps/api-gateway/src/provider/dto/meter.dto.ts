import { IsOptional, IsString, IsNumberString, IsArray, ValidateNested } from 'class-validator';
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
