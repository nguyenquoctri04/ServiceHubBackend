import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { NotificationPatterns } from '@app/common';
import { ProviderNotificationsService } from './provider.notifications.service';

function extractPayload<T>(raw: any): T {
  if (raw && typeof raw === 'object' && 'data' in raw && 'meta' in raw) {
    return raw.data as T;
  }
  return raw as T;
}

@Controller()
export class ProviderNotificationsController {
  constructor(private readonly service: ProviderNotificationsService) {}

  /**
   * Lấy danh sách thông báo IN_APP của user/provider.
   * Caller: API Gateway → GET /api/provider/notifications
   */
  @MessagePattern({ cmd: NotificationPatterns.GET_USER_NOTIFICATIONS })
  async getUserNotifications(
    @Payload() data: any,
  ) {
    const payload = extractPayload<{ userId?: string; providerId?: string }>(data);
    const userIds = [payload?.userId, payload?.providerId].filter(Boolean) as string[];
    return this.service.getUserNotifications(userIds.length > 0 ? userIds : [payload?.userId!]);
  }

  @MessagePattern({ cmd: NotificationPatterns.CREATE_IN_APP })
  async createInAppNotification(
    @Payload() data: any,
  ) {
    const payload = extractPayload<{ userId?: string; providerId?: string; title?: string; content?: string; createdBy?: string }>(data);
    const targetUserId = payload?.userId || payload?.providerId;
    const createdBy = payload?.createdBy || (payload?.userId && payload?.providerId ? payload?.providerId : null);
    if (!targetUserId) {
      throw new RpcException({ message: 'Target userId or providerId is required', statusCode: 400 });
    }
    return this.service.createInAppNotification({
      userId: targetUserId,
      title: payload?.title || 'Thông báo mới',
      content: payload?.content || '',
      createdBy,
    });
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc.
   * Caller: API Gateway → PUT /api/provider/notifications/read-all
   */
  @MessagePattern({ cmd: NotificationPatterns.MARK_ALL_READ })
  async markAllReadProvider(
    @Payload() data: any,
  ) {
    const payload = extractPayload<{ userId?: string; providerId?: string }>(data);
    const userIds = [payload?.userId, payload?.providerId].filter(Boolean) as string[];
    return this.service.markAllRead(userIds.length > 0 ? userIds : [payload?.userId!]);
  }

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc.
   * Caller: API Gateway → PUT /api/provider/notifications/:id/read
   */
  @MessagePattern({ cmd: NotificationPatterns.MARK_READ })
  async markReadProvider(
    @Payload() data: any,
  ) {
    const payload = extractPayload<{ notificationId: string; userId?: string; providerId?: string }>(data);
    const userIds = [payload?.userId, payload?.providerId].filter(Boolean) as string[];
    return this.service.markReadInApp(payload?.notificationId, userIds.length > 0 ? userIds : [payload?.userId!]);
  }

  /**
   * Phát socket event contract.signature-status.changed.v1 tới các bên liên quan.
   */
  @MessagePattern({ cmd: NotificationPatterns.EMIT_CONTRACT_STATUS_CHANGED })
  async emitContractStatusChanged(
    @Payload() data: any,
  ) {
    const payload = extractPayload<{
      contractId: string;
      status: string;
      recipientUserIds: string[];
      occurredAt?: string;
      eventId?: string;
    }>(data);
    return this.service.emitContractStatusChanged(payload);
  }
}
