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
  constructor(private readonly service: ProviderNotificationsService) { }

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
    @Payload() raw: any,
  ) {
    const payload = extractPayload<{
      userId?: string;
      providerId?: string;
      title?: string;
      content?: string;
      createdBy?: string;
      data?: {
        userId?: string;
        providerId?: string;
        title?: string;
        content?: string;
        createdBy?: string;
      };
    }>(raw);

    // HmacGuard thường bóc envelope; hỗ trợ thêm trường hợp transport vẫn chuyển { meta, data } nguyên vẹn.
    const data = payload?.data ?? payload;
    if (!data || typeof data !== 'object') {
      throw new RpcException({
        statusCode: 400,
        message: 'Payload thông báo không hợp lệ.',
      });
    }

    const targetUserId = data.userId || data.providerId;
    const createdBy = data.createdBy || (data.userId && data.providerId ? data.providerId : null);

    if (
      !targetUserId ||
      typeof data.title !== 'string' ||
      typeof data.content !== 'string'
    ) {
      throw new RpcException({
        statusCode: 400,
        message: 'Thiếu người nhận hoặc nội dung thông báo.',
      });
    }

    return this.service.createInAppNotification({
      userId: targetUserId,
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
