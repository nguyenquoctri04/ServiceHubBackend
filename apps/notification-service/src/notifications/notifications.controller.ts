import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  /**
   * Lấy danh sách thông báo IN_APP của user.
   * Caller: API Gateway → GET /api/provider/notifications
   */
  @MessagePattern({ cmd: 'notifications.getUserNotifications' })
  async getUserNotifications(
    @Payload() data: { userId: string; providerId?: string },
  ) {
    return this.service.getUserNotifications(data.userId, data.providerId);
  }

  @MessagePattern({ cmd: 'notifications.createInApp' })
  async createInAppNotification(
    @Payload() data: { userId: string; providerId?: string; title: string; content: string },
  ) {
    return this.service.createInAppNotification(data);
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc.
   * Caller: API Gateway → PUT /api/provider/notifications/read-all
   */
  @MessagePattern({ cmd: 'notifications.markAllRead' })
  async markAllRead(
    @Payload() data: { userId: string; providerId?: string },
  ) {
    return this.service.markAllRead(data.userId, data.providerId);
  }

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc.
   * Caller: API Gateway → PUT /api/provider/notifications/:id/read
   */
  @MessagePattern({ cmd: 'notifications.markRead' })
  async markRead(
    @Payload() data: { notificationId: string; userId: string },
  ) {
    return this.service.markRead(data.notificationId, data.userId);
  }
}

