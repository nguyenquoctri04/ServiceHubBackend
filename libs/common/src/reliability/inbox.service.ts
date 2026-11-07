import { Injectable, Logger } from '@nestjs/common';
import { InboxClaimOptions } from './reliability.types';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  /**
   * Đăng ký (claim) một event trong bảng inbox_message.
   * Trả về true nếu đây là lần đầu tiên consumer này nhận event (hợp lệ để xử lý).
   * Trả về false nếu event này đã được xử lý hoặc đang xử lý (bỏ qua để chống duplicate).
   */
  async claim(txOrPrisma: any, options: InboxClaimOptions): Promise<boolean> {
    try {
      await txOrPrisma.inboxMessage.create({
        data: {
          consumerName: options.consumerName,
          eventId: options.eventId,
          eventType: options.eventType,
          producer: options.producer || 'servicehub.broker',
          orderingKey: options.orderingKey || null,
          payloadHash: options.payloadHash || null,
          status: 'PROCESSING',
          receivedAt: new Date(),
        },
      });
      return true;
    } catch (error: any) {
      // Mã P2002 của Prisma là lỗi vi phạm ràng buộc Unique (Khóa chính consumerName + eventId đã tồn tại)
      if (error?.code === 'P2002') {
        this.logger.debug(
          `[InboxService] Event ${options.eventId} đã được ${options.consumerName} nhận trước đó. Bỏ qua trùng lặp.`,
        );
        return false;
      }
      throw error;
    }
  }

  /**
   * Đánh dấu xử lý thành công.
   */
  async markProcessed(txOrPrisma: any, consumerName: string, eventId: string): Promise<void> {
    await txOrPrisma.inboxMessage.update({
      where: {
        consumerName_eventId: {
          consumerName,
          eventId,
        },
      },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });
  }

  /**
   * Đánh dấu xử lý thất bại để cho phép thử lại hoặc điều tra.
   */
  async markFailed(txOrPrisma: any, consumerName: string, eventId: string): Promise<void> {
    await txOrPrisma.inboxMessage.update({
      where: {
        consumerName_eventId: {
          consumerName,
          eventId,
        },
      },
      data: {
        status: 'FAILED',
      },
    });
  }
}
