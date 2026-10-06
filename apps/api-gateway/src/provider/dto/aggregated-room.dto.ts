import { IsString, IsOptional, IsNumber } from 'class-validator';

export class RoomTypeDto {
  @IsString()
  id: string;

  @IsString()
  typeName: string;
}

export class TenantDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;
}

export class ContractDto {
  @IsString()
  id: string;

  @IsString()
  contractNumber: string;

  @IsString()
  endDate: string;
}

export class AggregatedRoomResponseDto {
  @IsString()
  id: string;

  @IsString()
  roomNumber: string;

  @IsString()
  roomTypeId?: string;

  @IsString()
  status: string;

  @IsOptional()
  roomType?: RoomTypeDto;

  @IsString()
  rentStatus: string;

  @IsOptional()
  tenant?: TenantDto;

  @IsNumber()
  debtAmount: number;

  @IsOptional()
  contract?: ContractDto;

  @IsString()
  @IsOptional()
  floorId?: string;

  @IsString()
  @IsOptional()
  floorName?: string;

  @IsString()
  @IsOptional()
  blockId?: string;

  @IsString()
  @IsOptional()
  blockName?: string;
}
