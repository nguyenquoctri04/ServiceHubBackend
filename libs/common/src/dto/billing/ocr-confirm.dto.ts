import { IsNumber, IsOptional, IsString, IsUrl, IsUUID, ValidateIf } from 'class-validator';

export class OcrConfirmDto {
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
  @IsUrl()
  @IsString()
  imgUrl?: string;
}
