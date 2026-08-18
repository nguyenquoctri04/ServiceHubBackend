import { Inject, Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { NotificationPatterns, SecureRpcService } from "@app/common";
import { CreateAdminNotificationDto } from "./dto/create-admin-notification.dto";
import { ListMyNotificationsDto } from "./dto/list-my-notifications.dto";

type CurrentUser = {
  id: string;
  email: string;
  role: string;
};

@Injectable()
export class GatewayNotificationsService {
  private readonly logger = new Logger(GatewayNotificationsService.name);

  constructor(
    @Inject("NOTIFICATION_SERVICE")
    private readonly notificationClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
  ) {}

  createAdminNotification(dto: CreateAdminNotificationDto, user: CurrentUser) {
    this.logger.log(`[Gateway] createAdminNotification dto=${JSON.stringify(dto)} user=${JSON.stringify(user)}`);
    return this.send(NotificationPatterns.ADMIN_CREATE, {
      title: dto.title,
      content: dto.content,
      targetType: dto.targetType,
      targetRole: dto.targetRole,
      recipientIds: dto.recipientIds,
      payload: dto.payload,
      currentUser: user,
    });
  }

  listAdmin(query: ListMyNotificationsDto, user: CurrentUser) {
    return this.send(NotificationPatterns.USER_LIST, {
      ...query,
      userId: user.id,
      adminView: true,
    });
  }

  listMine(query: ListMyNotificationsDto, user: CurrentUser) {
    return this.send(NotificationPatterns.USER_LIST, {
      ...query,
      userId: user.id,
    });
  }

  markRead(notificationId: string, user: CurrentUser) {
    return this.send(NotificationPatterns.USER_MARK_READ, {
      notificationId,
      userId: user.id,
    });
  }

  markAllRead(user: CurrentUser) {
    return this.send(NotificationPatterns.USER_MARK_ALL_READ, {
      userId: user.id,
    });
  }

  unreadCount(user: CurrentUser) {
    return this.send(NotificationPatterns.USER_UNREAD_COUNT, {
      userId: user.id,
    });
  }

  private async send(pattern: string, payload: unknown) {
    try {
      return await this.secureRpc.send(
        this.notificationClient,
        { cmd: pattern },
        payload,
      );
    } catch (err: any) {
      const statusCode =
        err?.status || err?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        err?.message ||
        err?.response?.message ||
        (typeof err === "string" ? err : "Notification service error");

      throw new HttpException(message, statusCode);
    }
  }
}
