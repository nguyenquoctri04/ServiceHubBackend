import { IsUUID } from "class-validator";

export class MarkNotificationReadDto {
  @IsUUID("4")
  userId: string;

  @IsUUID("4")
  notificationId: string;
}
