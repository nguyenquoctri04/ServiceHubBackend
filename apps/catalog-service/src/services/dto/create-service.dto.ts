import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

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
}
