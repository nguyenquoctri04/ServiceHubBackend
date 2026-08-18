import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ProviderTypeEnum {
  PROPERTY_MANAGER = 'PROPERTY_MANAGER',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
}

export enum BusinessTypeEnum {
  INDIVIDUAL = 'INDIVIDUAL',
  HOUSEHOLD = 'HOUSEHOLD',
  COMPANY = 'COMPANY',
}

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  providerName: string;

  @IsEnum(ProviderTypeEnum)
  @IsNotEmpty()
  providerType: ProviderTypeEnum;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(BusinessTypeEnum)
  @IsOptional()
  businessType?: BusinessTypeEnum;
}
