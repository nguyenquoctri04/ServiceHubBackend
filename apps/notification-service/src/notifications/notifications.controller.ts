import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from "@nestjs/microservices";
import { NotificationPatterns } from "@app/common";
import { NotificationsService } from './notifications.service';
import { CreateAdminNotificationDto } from "./dto/create-admin-notification.dto";
import { CreateEventNotificationDto } from "./dto/create-event-notification.dto";
import { ListNotificationsDto } from "./dto/list-notifications.dto";
import { MarkNotificationReadDto } from "./dto/mark-read.dto";

@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly service: NotificationsService) {}

  @MessagePattern({ cmd: NotificationPatterns.ADMIN_CREATE })
  createAdminNotification(@Payload() payload: any) {
    this.logger.log(`[RPC] createAdminNotification payload: ${JSON.stringify(payload)}`);
    return this.service.createAdminNotification(
      payload,
      payload?.currentUser?.id,
    );
  }

  @MessagePattern({ cmd: NotificationPatterns.EVENT_CREATE })
  createEventNotification(@Payload() payload: CreateEventNotificationDto) {
    return this.service.createEventNotification(payload);
  }

  @MessagePattern({ cmd: NotificationPatterns.USER_LIST })
  listForUser(@Payload() payload: ListNotificationsDto) {
    return this.service.listForUser(payload);
  }

  @MessagePattern({ cmd: NotificationPatterns.USER_MARK_READ })
  markRead(@Payload() payload: MarkNotificationReadDto) {
    return this.service.markRead(payload);
  }

  @MessagePattern({ cmd: NotificationPatterns.USER_MARK_ALL_READ })
  markAllRead(@Payload() payload: { userId: string }) {
    return this.service.markAllRead(payload.userId);
  }

  @MessagePattern({ cmd: NotificationPatterns.USER_UNREAD_COUNT })
  unreadCount(@Payload() payload: { userId: string }) {
    return this.service.unreadCount(payload.userId);
  }
}
