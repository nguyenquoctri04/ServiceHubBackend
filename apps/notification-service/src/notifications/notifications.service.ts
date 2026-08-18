import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationListItem {
  id: string;
  title: string | null;
  content: string | null;
  status: string;
  channel: string;
  sendAt: Date;
  providerId: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách thông báo IN_APP của một user (có thể lọc theo providerId).
   * Chỉ trả về tối đa 50 thông báo gần nhất để tránh quá tải UI.
   */
  async getUserNotifications(userId: string, providerId?: string): Promise<NotificationListItem[]> {
    const where: Record<string, unknown> = {
      userId,
      channel: 'IN_APP',
    };

    if (providerId) {
      where.providerId = providerId;
    }

    return this.prisma.notification.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        channel: true,
        sendAt: true,
        providerId: true,
      },
      orderBy: { sendAt: 'desc' },
      take: 50,
    });
  }

  async createInAppNotification(data: {
    userId: string;
    providerId?: string;
    title: string;
    content: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        providerId: data.providerId ?? null,
        title: data.title,
        content: data.content,
        channel: 'IN_APP',
        status: 'SENT',
        sendAt: new Date(),
      },
    });
  }

  /**
   * Đánh dấu tất cả thông báo IN_APP của user là đã đọc (status = READ).
   */
  async markAllRead(userId: string, providerId?: string): Promise<{ count: number }> {
    const where: Record<string, unknown> = {
      userId,
      channel: 'IN_APP',
      status: { not: 'READ' },
    };

    if (providerId) {
      where.providerId = providerId;
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: { status: 'READ' },
    });

    return { count: result.count };
  }

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc.
   * Kiểm tra quyền sở hữu (userId) trước khi update để tránh IDOR.
   */
  async markRead(notificationId: string, userId: string): Promise<{ success: boolean }> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return { success: false };
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'READ' },
    });

    return { success: true };
  }
}

