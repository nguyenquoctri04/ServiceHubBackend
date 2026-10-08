import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class RoomTypeDto {
  @IsUUID()
  id: string;

  @IsString()
  typeName: string;
}

export class TenantDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;
}

export class ContractDto {
  @IsUUID()
  id: string;

  @IsString()
  contractNumber: string;

  @IsString()
  endDate: string;
}

export class AggregatedRoomResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  roomNumber: string;

  @IsUUID()
  @IsOptional()
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

  @IsUUID()
  @IsOptional()
  floorId?: string;

  @IsString()
  @IsOptional()
  floorName?: string;

  @IsUUID()
  @IsOptional()
  blockId?: string;

  @IsString()
  @IsOptional()
  blockName?: string;
}
