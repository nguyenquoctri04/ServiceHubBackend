import { IsNotEmpty, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class IdentityDocumentDto {
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsString()
  @IsOptional()
  frontImageUrl?: string;

  @IsString()
  @IsOptional()
  backImageUrl?: string;
  
  @IsString()
  @IsOptional()
  selfieImageUrl?: string;
}

export class SubmitVerificationDto {
  @IsString()
  @IsNotEmpty()
  identityId: string;

  @IsString()
  @IsNotEmpty()
  provider: string; // e.g., 'VNPT_EKYC'

  @ValidateNested()
  @Type(() => IdentityDocumentDto)
  @IsNotEmpty()
  documents: IdentityDocumentDto;
}
