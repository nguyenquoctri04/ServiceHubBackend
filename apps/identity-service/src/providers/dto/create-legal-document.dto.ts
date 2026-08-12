import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { LegalDocumentType } from '@prisma/client-identity';

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
