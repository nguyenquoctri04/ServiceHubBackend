import { IsString, IsOptional, IsArray, ValidateNested, IsUUID, IsNumber, IsBoolean, ArrayMinSize, IsIn, MaxLength } from 'class-validator';
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

export class CreateViolationDto {
  @IsUUID() contractId: string;
  @IsString() @MaxLength(1000) description: string;
  @IsString() @IsOptional() @MaxLength(100) violationType?: string;
}

export class CreateViolationAppealDto {
  @IsString() @MaxLength(2000) reason: string;
}

export class ViolationActionDto {
  @IsIn(['WARNING', 'REQUEST_CORRECTION', 'FINE', 'RESTRICT', 'TERMINATE_CONTRACT', 'NO_ACTION'])
  actionType: 'WARNING' | 'REQUEST_CORRECTION' | 'FINE' | 'RESTRICT' | 'TERMINATE_CONTRACT' | 'NO_ACTION';

  @IsString() @MaxLength(2000) description: string;
  @IsBoolean() resolveViolation: boolean;
  @IsBoolean() @IsOptional() createRestriction?: boolean;
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
