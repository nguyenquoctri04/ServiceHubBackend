import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ServiceBillingRuleDto,
  ServicePriceDto,
  ServiceType,
} from './create-service.dto';

export class UpdateServiceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsEnum(ServiceType) serviceType?: ServiceType;
  @IsOptional() @ValidateNested() @Type(() => ServiceBillingRuleDto) billingRule?: ServiceBillingRuleDto;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsUUID() roomTypeId?: string;
  @IsOptional() @IsBoolean() requiresPrepayment?: boolean;
  @IsOptional() @IsBoolean() requiresContract?: boolean;
  @IsOptional() @IsEnum(['ACTIVE', 'INACTIVE']) status?: 'ACTIVE' | 'INACTIVE';
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ServicePriceDto) prices?: ServicePriceDto[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) requiredServiceIds?: string[];
}
