import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

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
  @IsString()
  documentName?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsUrl()
  @IsNotEmpty()
  fileUrl: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
