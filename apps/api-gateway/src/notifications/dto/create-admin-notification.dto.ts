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
} from "class-validator";
import { NotificationTargetTypeValue } from "@app/common";

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
}
