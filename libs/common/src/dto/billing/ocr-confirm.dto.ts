import { IsNumber, IsOptional, IsString, IsUrl, IsUUID, ValidateIf } from 'class-validator';

export class OcrConfirmDto {
  @IsUUID()
  meterId: string;

  @ValidateIf((o) => !o.contractId)
  @IsUUID()
  roomId?: string;

  @ValidateIf((o) => !o.roomId)
  @IsUUID()
  contractId?: string;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsUrl()
  @IsString()
  imgUrl?: string;
}
