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

  // // ── Provider / In-app patterns (HEAD) ───────────────────────────────────

  // /**
  //  * Lấy danh sách thông báo IN_APP của user.
  //  * Caller: API Gateway → GET /api/provider/notifications
  //  */
  // @MessagePattern({ cmd: 'notifications.getUserNotifications' })
  // async getUserNotifications(
  //   @Payload() data: { userId: string; providerId?: string },
  // ) {
  //   return this.service.getUserNotifications(data.userId, data.providerId);
  // }

  // @MessagePattern({ cmd: 'notifications.createInApp' })
  // async createInAppNotification(
  //   @Payload() data: { userId: string; providerId?: string; title: string; content: string },
  // ) {
  //   return this.service.createInAppNotification(data);
  // }

  // /**
  //  * Đánh dấu tất cả thông báo là đã đọc.
  //  * Caller: API Gateway → PUT /api/provider/notifications/read-all
  //  */
  // @MessagePattern({ cmd: 'notifications.markAllRead' })
  // async markAllReadProvider(
  //   @Payload() data: { userId: string; providerId?: string },
  // ) {
  //   return this.service.markAllRead(data.userId, data.providerId);
  // }

  // /**
  //  * Đánh dấu một thông báo cụ thể là đã đọc.
  //  * Caller: API Gateway → PUT /api/provider/notifications/:id/read
  //  */
  // @MessagePattern({ cmd: 'notifications.markRead' })
  // async markReadProvider(
  //   @Payload() data: { notificationId: string; userId: string },
  // ) {
  //   return this.service.markReadInApp(data.notificationId, data.userId);
  // }

  // // ── Admin & Event & User Broadcast patterns (ef66d5b) ───────────────────

  // @MessagePattern({ cmd: NotificationPatterns.ADMIN_CREATE })
  // createAdminNotification(@Payload() payload: any) {
  //   this.logger.log(`[RPC] createAdminNotification payload: ${JSON.stringify(payload)}`);
  //   return this.service.createAdminNotification(
  //     payload,
  //     payload?.currentUser?.id,
  //   );
  // }

  // @MessagePattern({ cmd: NotificationPatterns.EVENT_CREATE })
  // createEventNotification(@Payload() payload: CreateEventNotificationDto) {
  //   return this.service.createEventNotification(payload);
  // }

  // @MessagePattern({ cmd: NotificationPatterns.USER_LIST })
  // listForUser(@Payload() payload: ListNotificationsDto) {
  //   return this.service.listForUser(payload);
  // }

  // @MessagePattern({ cmd: NotificationPatterns.USER_MARK_READ })
  // markRead(@Payload() payload: MarkNotificationReadDto) {
  //   return this.service.markRead(payload);
  // }

  // @MessagePattern({ cmd: NotificationPatterns.USER_MARK_ALL_READ })
  // markAllRead(@Payload() payload: { userId: string }) {
  //   return this.service.markAllRead(payload.userId);
  // }

  // @MessagePattern({ cmd: NotificationPatterns.USER_UNREAD_COUNT })
  // unreadCount(@Payload() payload: { userId: string }) {
  //   return this.service.unreadCount(payload.userId);
  // }
}
