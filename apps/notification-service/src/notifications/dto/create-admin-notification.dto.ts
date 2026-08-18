import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { NotificationTargetTypeValue } from "@app/common";

export class CurrentUserPayloadDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class CreateAdminNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(NotificationTargetTypeValue)
  targetType: NotificationTargetTypeValue;

  @ValidateIf((dto) => dto.targetType === NotificationTargetTypeValue.ROLE)
  @IsString()
  targetRole?: string;

  @ValidateIf((dto) => dto.targetType === NotificationTargetTypeValue.USER)
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  recipientIds?: string[];

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => CurrentUserPayloadDto)
  currentUser?: CurrentUserPayloadDto;
}
