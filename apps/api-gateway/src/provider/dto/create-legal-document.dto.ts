import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

enum LegalDocumentType {
  BUSINESS_LICENSE = 'BUSINESS_LICENSE',
  TAX_CERTIFICATE = 'TAX_CERTIFICATE',
  OTHER = 'OTHER'
}

export class CreateLegalDocumentDto {
  @IsEnum(LegalDocumentType)
  @IsNotEmpty()
  documentType: LegalDocumentType;

  @IsOptional()
  @IsString() @MaxLength(255)
  documentName?: string;

  @IsOptional()
  @IsString() @MaxLength(255)
  documentNumber?: string;

  @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2048)
  @IsNotEmpty()
  fileUrl: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
