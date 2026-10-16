import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export enum MeterReadingSourceDto {
  MANUAL = 'MANUAL',
  IMAGE = 'IMAGE',
  EXCEL_IMPORT = 'EXCEL_IMPORT'
}

export class CreateMeterReadingDto {
  @IsString()
  meterId: string;

  @ValidateIf((o) => !o.contractId)
  @IsString()
  roomId?: string;

  @ValidateIf((o) => !o.roomId)
  @IsString()
  contractId?: string;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  imgUrl?: string;

  @IsOptional()
  @IsEnum(MeterReadingSourceDto)
  source?: MeterReadingSourceDto;
}
