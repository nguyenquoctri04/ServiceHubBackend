import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationPatterns } from '@app/common';
import { ProviderNotificationsService } from './provider.notifications.service';

@Controller()
export class ProviderNotificationsController {
  constructor(private readonly service: ProviderNotificationsService) {}

  /**
   * Lấy danh sách thông báo IN_APP của user/provider.
   * Caller: API Gateway → GET /api/provider/notifications
   */
  @MessagePattern({ cmd: NotificationPatterns.GET_USER_NOTIFICATIONS })
  async getUserNotifications(
    @Payload() data: { userId?: string; providerId?: string },
  ) {
    const userIds = [data.userId, data.providerId].filter(Boolean) as string[];
    return this.service.getUserNotifications(userIds.length > 0 ? userIds : [data.userId!]);
  }

  @MessagePattern({ cmd: NotificationPatterns.CREATE_IN_APP })
  async createInAppNotification(
    @Payload() data: { userId?: string; providerId?: string; title: string; content: string; createdBy?: string },
  ) {
    const targetUserId = data.userId || data.providerId;
    const createdBy = data.createdBy || (data.userId && data.providerId ? data.providerId : null);
    return this.service.createInAppNotification({
      userId: targetUserId!,
      title: data.title,
      content: data.content,
      createdBy,
    });
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc.
   * Caller: API Gateway → PUT /api/provider/notifications/read-all
   */
  @MessagePattern({ cmd: NotificationPatterns.MARK_ALL_READ })
  async markAllReadProvider(
    @Payload() data: { userId?: string; providerId?: string },
  ) {
    const userIds = [data.userId, data.providerId].filter(Boolean) as string[];
    return this.service.markAllRead(userIds.length > 0 ? userIds : [data.userId!]);
  }

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc.
   * Caller: API Gateway → PUT /api/provider/notifications/:id/read
   */
  @MessagePattern({ cmd: NotificationPatterns.MARK_READ })
  async markReadProvider(
    @Payload() data: { notificationId: string; userId?: string; providerId?: string },
  ) {
    const userIds = [data.userId, data.providerId].filter(Boolean) as string[];
    return this.service.markReadInApp(data.notificationId, userIds.length > 0 ? userIds : [data.userId!]);
  }
}
