import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsPositive, IsUUID, Max } from "class-validator";

export class ListNotificationsDto {
  @IsOptional()
  @IsUUID("4")
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  adminView?: boolean;
}
