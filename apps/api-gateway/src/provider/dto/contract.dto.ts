import { IsString, IsOptional, IsArray, ValidateNested, IsUUID, IsNumber, IsBoolean, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class ContractServiceDto {
  @IsUUID()
  servicePriceId: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;
}

export class CreateContractDto {
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsUUID()
  customerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractServiceDto)
  services: ContractServiceDto[];

  @IsArray()
  @IsUUID("4", { each: true })
  @IsOptional()
  termIds?: string[];


  @IsUUID()
  @IsOptional()
  roomId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  requireSignature?: boolean;
}

export class UpdateContractDto {
  @IsUUID() @IsOptional() roomId?: string;
  @IsString() @IsOptional() startDate?: string;
  @IsString() @IsOptional() endDate?: string;
  @IsBoolean() @IsOptional() requireSignature?: boolean;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ContractServiceDto) @IsOptional()
  services?: ContractServiceDto[];
  @IsArray() @IsUUID('4', { each: true }) @IsOptional() termIds?: string[];
}

export class ContractActionDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ContractQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}
