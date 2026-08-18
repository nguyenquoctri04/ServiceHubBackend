import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateMeterReadingDto } from './create-meter-reading.dto';

export class ExcelImportConfirmDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMeterReadingDto)
  rows: CreateMeterReadingDto[];
}
