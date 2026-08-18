import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested, IsArray, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ServiceType {
  NORMAL = 'NORMAL',
  ADDITION = 'ADDITION',
}

export enum CalculationMethod {
  FIXED = 'FIXED',
  QUANTITY = 'QUANTITY',
  METERED = 'METERED',
}

export enum BillingFrequency {
  ONE_TIME = 'ONE_TIME',
  RECURRING = 'RECURRING',
}

export enum BillingIntervalUnit {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

export class ServiceBillingRuleDto {
  @IsEnum(CalculationMethod)
  @IsNotEmpty()
  calculationMethod: CalculationMethod;

  @IsEnum(BillingFrequency)
  @IsNotEmpty()
  billingFrequency: BillingFrequency;

  @IsNumber()
  @Min(1)
  @IsOptional()
  billingIntervalValue?: number;

  @IsEnum(BillingIntervalUnit)
  @IsNotEmpty()
  billingIntervalUnit: BillingIntervalUnit;
}

export class ServicePriceDto {
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType: ServiceType;

  @ValidateNested()
  @Type(() => ServiceBillingRuleDto)
  @IsNotEmpty()
  billingRule: ServiceBillingRuleDto;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  confirmDistanceWarning?: boolean;

  @IsUUID()
  @IsOptional()
  roomTypeId?: string;

  @IsBoolean()
  @IsOptional()
  requiresPrepayment?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresContract?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePriceDto)
  prices: ServicePriceDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}
