import {
  ArrayNotEmpty,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class CreateEventNotificationDto {
  @IsString()
  eventType: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  recipientIds: string[];

  @IsOptional()
  @IsUUID("4")
  actorId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
