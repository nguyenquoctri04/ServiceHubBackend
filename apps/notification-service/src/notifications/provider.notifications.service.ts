import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel, NotificationStatus } from '@prisma/client-notification';
import { NotificationsGateway } from './notifications.gateway';

export interface ProviderNotificationListItem {
  id: string;
  title: string;
  content: string;
  status: NotificationStatus;
  channel: NotificationChannel;
  sendAt: Date;
  createdBy: string | null;
}

@Injectable()
export class ProviderNotificationsService {
  private readonly logger = new Logger(ProviderNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * Lấy danh sách thông báo IN_APP của provider/user.
   * Người nhận luôn là userId (với provider thì userId có thể là providerId).
   */
  async getUserNotifications(userIdInput: string | string[]): Promise<ProviderNotificationListItem[]> {
    const userIds = Array.isArray(userIdInput) ? userIdInput.filter(Boolean) : [userIdInput].filter(Boolean);
    return this.prisma.notification.findMany({
      where: {
        userId: userIds.length === 1 ? userIds[0] : { in: userIds },
        channel: NotificationChannel.IN_APP,
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        channel: true,
        sendAt: true,
        createdBy: true,
      },
      orderBy: { sendAt: 'desc' },
      take: 50,
    });
  }

  async createInAppNotification(data: {
    userId: string;
    title: string;
    content: string;
    createdBy?: string | null;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        createdBy: data.createdBy ?? null,
        title: data.title,
        content: data.content,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        sendAt: new Date(),
      },
    });

    try {
      this.gateway.emitNewNotification(data.userId, notification);
      const unreadCount = await this.prisma.notification.count({
        where: { userId: data.userId, status: { not: NotificationStatus.READ } },
      });
      this.gateway.emitUnreadCount(data.userId, unreadCount);
    } catch (err: any) {
      this.logger.warn(`Failed to emit socket notification to user ${data.userId}: ${err?.message || err}`);
    }

    return notification;
  }

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc (theo context provider / user id).
   */
  async markReadInApp(notificationId: string, userIdInput: string | string[]): Promise<{ success: boolean }> {
    const userIds = Array.isArray(userIdInput) ? userIdInput.filter(Boolean) : [userIdInput].filter(Boolean);
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: userIds.length === 1 ? userIds[0] : { in: userIds },
      },
    });

    if (!notification) {
      return { success: false };
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });

    try {
      this.gateway.emitRead(notification.userId, notificationId);
      const unread = await this.prisma.notification.count({
        where: { userId: notification.userId, status: { not: NotificationStatus.READ } },
      });
      this.gateway.emitUnreadCount(notification.userId, unread);
    } catch (err: any) {
      this.logger.warn(`Failed to emit read socket event: ${err?.message || err}`);
    }

    return { success: true };
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc.
   */
  async markAllRead(userIdInput: string | string[]) {
    const userIds = Array.isArray(userIdInput) ? userIdInput.filter(Boolean) : [userIdInput].filter(Boolean);
    const now = new Date();
    const where = {
      userId: userIds.length === 1 ? userIds[0] : { in: userIds },
      status: { not: NotificationStatus.READ },
    };

    const result = await this.prisma.notification.updateMany({
      where,
      data: {
        status: NotificationStatus.READ,
        readAt: now,
      },
    });

    for (const uid of userIds) {
      try {
        const remainingUnread = await this.prisma.notification.count({
          where: { userId: uid, status: { not: NotificationStatus.READ } },
        });
        this.gateway.emitUnreadCount(uid, remainingUnread);
      } catch (err: any) {
        this.logger.warn(`Failed to emit unread count: ${err?.message || err}`);
      }
    }

    return {
      count: result.count,
      updated: result.count,
    };
  }
}
