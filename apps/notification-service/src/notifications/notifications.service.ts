import { Inject, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
  IdentityNotificationPatterns,
  NotificationEventType,
  NotificationTargetTypeValue,
  SecureRpcService,
} from "@app/common";
import {
  NotificationChannel,
  NotificationKind,
  NotificationStatus,
  NotificationTargetType,
  Prisma,
} from "@prisma/client-notification";
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminNotificationDto } from "./dto/create-admin-notification.dto";
import { CreateEventNotificationDto } from "./dto/create-event-notification.dto";
import { ListNotificationsDto } from "./dto/list-notifications.dto";
import { MarkNotificationReadDto } from "./dto/mark-read.dto";
import { NotificationsGateway } from "./notifications.gateway";

type NotificationRecipient = {
  id: string;
  email: string;
  role: string;
};

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly secureRpc: SecureRpcService,
    @Inject("IDENTITY_SERVICE")
    private readonly identityClient: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.prisma.notification.updateMany({
        where: {
          OR: [
            { title: "Thông báo hệ thống" },
            { content: "Nội dung thông báo hệ thống." },
            { title: null },
            { content: null },
          ],
        },
        data: {
          title: "Thông báo từ quản trị viên",
          content: "Bạn có một thông báo mới từ Quản trị viên hệ thống.",
        },
      });
      this.logger.log("✅ Auto-cleaned up old generic notification records in DB");
    } catch (err) {
      this.logger.error("Failed to auto-cleanup old notification records:", err);
    }
  }

  async createAdminNotification(
    dto: CreateAdminNotificationDto,
    adminId?: string,
  ) {
    this.logger.log(`[Service] createAdminNotification dto=${JSON.stringify(dto)} adminId=${adminId}`);
    let recipientIds: string[] = [];
    try {
      const recipients = await this.resolveRecipients({
        targetType: dto.targetType,
        targetRole: dto.targetRole,
        recipientIds: dto.recipientIds,
      });
      recipientIds = recipients.map((recipient) => recipient.id);
    } catch (err) {
      console.error("Failed to resolve recipients via identity-service RPC:", err);
    }

    if (recipientIds.length === 0 && adminId) {
      recipientIds = [adminId];
    }

    if (recipientIds.length === 0) {
      recipientIds = [adminId || "30000000-0000-0000-0000-000000000001"];
    }

    return this.createForRecipients(
      recipientIds,
      {
        kind: NotificationKind.BROADCAST,
        targetType: dto.targetType as NotificationTargetType,
        createdBy: adminId,
        title: dto.title,
        content: dto.content,
        payload: this.toJson(dto.payload),
      },
    );
  }

  async createEventNotification(dto: CreateEventNotificationDto) {
    const payloadObj = (dto.payload || {}) as Record<string, unknown>;
    const title =
      dto.title?.trim() ||
      (payloadObj["title"] as string)?.trim() ||
      this.getDefaultTitle(dto.eventType);

    const content =
      dto.content?.trim() ||
      (payloadObj["content"] as string)?.trim() ||
      (payloadObj["message"] as string)?.trim() ||
      (payloadObj["description"] as string)?.trim() ||
      this.getDefaultContent(dto.eventType, payloadObj);

    return this.createForRecipients(dto.recipientIds, {
      kind: NotificationKind.EVENT,
      eventType: dto.eventType,
      actorId: dto.actorId,
      title,
      content,
      entityType: dto.entityType,
      entityId: dto.entityId,
      payload: this.toJson(dto.payload),
    });
  }

  async listForUser(dto: ListNotificationsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const where: Prisma.NotificationWhereInput = {
      ...(dto.adminView ? {} : { userId: dto.userId }),
      ...(dto.unreadOnly ? { status: { not: NotificationStatus.READ } } : {}),
    };

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        include: {
          template: true,
        },
        orderBy: { sendAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.getUnreadCountQuery(dto.userId),
    ]);

    const mappedItems = items.map((item) => {
      const payloadObj = (item.payload || {}) as Record<string, unknown>;
      const notifType = payloadObj["type"] as string | undefined;

      let fallbackTitle = "Thông báo từ hệ thống";
      let fallbackContent = "Bạn có một thông báo mới từ hệ thống ServiceHub.";

      if (item.eventType) {
        fallbackTitle = this.getDefaultTitle(item.eventType);
        fallbackContent = this.getDefaultContent(item.eventType, payloadObj);
      } else if (notifType) {
        switch (notifType) {
          case "MAINTENANCE":
            fallbackTitle = "Thông báo bảo trì";
            fallbackContent = "Hệ thống sắp tiến hành bảo trì dịch vụ. Rất mong quý khách thông cảm.";
            break;
          case "WARNING":
            fallbackTitle = "Cảnh báo hệ thống";
            fallbackContent = "Vui lòng lưu ý các thông tin cảnh báo quan trọng từ quản trị viên.";
            break;
          case "INFO":
            fallbackTitle = "Thông tin hệ thống";
            fallbackContent = "Bạn nhận được cập nhật thông tin mới từ hệ thống.";
            break;
          case "ANNOUNCEMENT":
          default:
            fallbackTitle = "Thông cáo từ quản trị viên";
            fallbackContent = "Bạn có một thông cáo mới từ Quản trị viên hệ thống.";
            break;
        }
      }

      const rawTitle = item.title?.trim();
      const rawContent = item.content?.trim();

      const isGenericTitle = !rawTitle || rawTitle === "Thông báo hệ thống";
      const isGenericContent = !rawContent || rawContent === "Nội dung thông báo hệ thống.";

      const title = !isGenericTitle ? rawTitle : (item.template?.title || fallbackTitle);
      const content = !isGenericContent ? rawContent : (item.template?.content || fallbackContent);

      return {
        ...item,
        title,
        content,
        targetType: item.targetType || "ALL",
      };
    });

    return {
      items: mappedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markRead(dto: MarkNotificationReadDto) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: dto.notificationId,
        userId: dto.userId,
      },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  });

    this.gateway.emitRead(dto.userId, updated.id);
    this.gateway.emitUnreadCount(dto.userId, await this.unreadCount(dto.userId));

    return updated;
  }

  async markAllRead(userId: string) {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: { not: NotificationStatus.READ },
      },
      data: {
        status: NotificationStatus.READ,
        readAt: now,
      },
    });

    this.gateway.emitUnreadCount(userId, 0);

    return {
      updated: result.count,
    };
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        status: { not: NotificationStatus.READ },
      },
    });
  }

  private getUnreadCountQuery(userId?: string) {
    return this.prisma.notification.count({
      where: {
        userId: userId || "00000000-0000-0000-0000-000000000000",
        status: { not: NotificationStatus.READ },
      },
    });
  }

  private async createForRecipients(
    recipientIds: string[],
    data: {
      kind: NotificationKind;
      title: string;
      content: string;
      targetType?: NotificationTargetType;
      eventType?: string;
      actorId?: string;
      createdBy?: string;
      entityType?: string;
      entityId?: string;
      payload?: Prisma.InputJsonValue;
    },
  ) {
    const uniqueRecipientIds = [...new Set(recipientIds)];
    const now = new Date();
    const payloadObj = (data.payload || {}) as Record<string, unknown>;
    const notifType = payloadObj["type"] as string | undefined;

    let fallbackTitle = "Thông báo từ hệ thống";
    let fallbackContent = "Bạn có một thông báo mới từ hệ thống ServiceHub.";

    if (data.eventType) {
      fallbackTitle = this.getDefaultTitle(data.eventType);
      fallbackContent = this.getDefaultContent(data.eventType, payloadObj);
    } else if (notifType) {
      switch (notifType) {
        case "MAINTENANCE":
          fallbackTitle = "Thông báo bảo trì";
          fallbackContent = "Hệ thống sắp tiến hành bảo trì dịch vụ. Rất mong quý khách thông cảm.";
          break;
        case "WARNING":
          fallbackTitle = "Cảnh báo hệ thống";
          fallbackContent = "Vui lòng lưu ý các thông tin cảnh báo quan trọng từ quản trị viên.";
          break;
        case "INFO":
          fallbackTitle = "Thông tin hệ thống";
          fallbackContent = "Bạn nhận được cập nhật thông tin mới từ hệ thống.";
          break;
        case "ANNOUNCEMENT":
        default:
          fallbackTitle = "Thông cáo từ quản trị viên";
          fallbackContent = "Bạn có một thông cáo mới từ Quản trị viên hệ thống.";
          break;
      }
    }

    const finalTitle = data.title?.trim() || fallbackTitle;
    const finalContent = data.content?.trim() || fallbackContent;

    this.logger.log(
      `[createForRecipients] finalTitle="${finalTitle}" finalContent="${finalContent}" recipients=${uniqueRecipientIds.length}`,
    );

    const notifications = await this.prisma.$transaction(
      uniqueRecipientIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            kind: data.kind,
            eventType: data.eventType,
            targetType: data.targetType || NotificationTargetType.ALL,
            actorId: data.actorId,
            createdBy: data.createdBy,
            entityType: data.entityType,
            entityId: data.entityId,
            payload: data.payload,
            title: finalTitle,
            content: finalContent,
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT,
            sendAt: now,
            deliveredAt: now,
          },
        }),
      ),
    );

    for (const notification of notifications) {
      const mappedNotification = {
        ...notification,
        title: notification.title || finalTitle,
        content: notification.content || finalContent,
      };
      this.gateway.emitNewNotification(notification.userId, mappedNotification);
      this.gateway.emitUnreadCount(
        notification.userId,
        await this.unreadCount(notification.userId),
      );
    }

    return {
      count: notifications.length,
      notifications,
    };
  }

  private async resolveRecipients(payload: {
    targetType: NotificationTargetTypeValue;
    targetRole?: string;
    recipientIds?: string[];
  }): Promise<NotificationRecipient[]> {
    return this.secureRpc.send<NotificationRecipient[]>(
      this.identityClient,
      { cmd: IdentityNotificationPatterns.RESOLVE_RECIPIENTS },
      payload,
    );
  }

  private getDefaultTitle(eventType: string) {
    const titles: Record<string, string> = {
      [NotificationEventType.CONTRACT_WAITING_SIGN]: "Hợp đồng cần ký",
      [NotificationEventType.INVOICE_CREATED]: "Hóa đơn mới",
      [NotificationEventType.PAYMENT_SUCCESS]: "Thanh toán thành công",
      [NotificationEventType.REPAIR_REQUEST_CREATED]: "Yêu cầu sửa chữa mới",
      [NotificationEventType.PROVIDER_APPROVED]: "Nhà cung cấp đã được duyệt",
      [NotificationEventType.PROVIDER_REJECTED]: "Hồ sơ nhà cung cấp bị từ chối",
      [NotificationEventType.SYSTEM_EVENT]: "Thông báo từ hệ thống",
    };

    return titles[eventType] || "Thông báo hệ thống";
  }

  private getDefaultContent(
    eventType: string,
    payload?: Record<string, unknown>,
  ) {
    const code = payload?.["code"] || payload?.["contractCode"] || payload?.["invoiceCode"] || payload?.["serviceCode"];
    const suffix = code ? `: ${code}` : "";

    const contents: Record<string, string> = {
      [NotificationEventType.CONTRACT_WAITING_SIGN]:
        `Bạn có hợp đồng đang chờ ký${suffix}.`,
      [NotificationEventType.INVOICE_CREATED]: `Bạn có hóa đơn mới${suffix}.`,
      [NotificationEventType.PAYMENT_SUCCESS]:
        `Giao dịch thanh toán đã thành công${suffix}.`,
      [NotificationEventType.REPAIR_REQUEST_CREATED]:
        `Có yêu cầu sửa chữa mới${suffix}.`,
      [NotificationEventType.PROVIDER_APPROVED]:
        "Hồ sơ nhà cung cấp của bạn đã được duyệt thành công.",
      [NotificationEventType.PROVIDER_REJECTED]:
        "Hồ sơ nhà cung cấp của bạn đã bị từ chối.",
      [NotificationEventType.SYSTEM_EVENT]:
        "Bạn vừa nhận được một thông báo mới từ hệ thống.",
    };

    return contents[eventType] || "Bạn vừa nhận được một thông báo mới từ hệ thống.";
  }

  private toJson(
    value?: Record<string, unknown>,
  ): Prisma.InputJsonValue | undefined {
    return value as Prisma.InputJsonValue | undefined;
  }
}
