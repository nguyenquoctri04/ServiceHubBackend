import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @MaxLength(200)
  propertyName: string;

  @IsString()
  @MaxLength(500)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class UpdatePropertyDto {
  @IsOptional() @IsString() @MaxLength(200) propertyName?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: 'ACTIVE' | 'INACTIVE';
}

export class CreateBlockDto {
  @IsString()
  @MaxLength(100)
  blockName: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class UpdateBlockDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  blockName?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class CreateFloorDto {
  @IsString()
  @MaxLength(100)
  floorName: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class UpdateFloorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  floorName?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class CreateRoomTypeDto {
  @IsString()
  @MaxLength(100)
  typeName: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  area: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxOccupancy: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class UpdateRoomTypeDto {
  @IsOptional() @IsString() @MaxLength(100) typeName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) area?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxOccupancy?: number;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: 'ACTIVE' | 'INACTIVE';
}

export class CreateRoomDto {
  // PostgreSQL accepts UUID-shaped identifiers without an RFC version. Existing
  // seed data uses that form, so preserve shape validation without rejecting it.
  @IsUUID('loose')
  roomTypeId: string;

  @IsUUID('loose')
  floorId: string;

  @IsString()
  @MaxLength(100)
  roomNumber: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'MAINTENANCE'])
  status?: 'ACTIVE' | 'MAINTENANCE';
}

export class UpdateRoomDto {
  @IsOptional() @IsUUID('loose') floorId?: string;
  @IsOptional() @IsUUID('loose') roomTypeId?: string;
  @IsOptional() @IsString() @MaxLength(100) roomNumber?: string;
  @IsOptional() @IsIn(['ACTIVE', 'MAINTENANCE']) status?: 'ACTIVE' | 'MAINTENANCE';
}
