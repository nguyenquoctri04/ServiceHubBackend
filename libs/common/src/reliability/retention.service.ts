import { Injectable, Logger } from '@nestjs/common';

export interface RetentionPurgeOptions {
  olderThanDays?: number;
  batchSize?: number;
}

export interface RetentionPurgeResult {
  purgedOutbox: number;
  purgedInbox: number;
}

@Injectable()
export class ReliabilityRetentionService {
  private readonly logger = new Logger(ReliabilityRetentionService.name);

  /**
   * Dọn dẹp an toàn các bản ghi Outbox và Inbox đã hoàn tất xử lý quá X ngày.
   * QUY TẮC BẢO MẬT & KIỂM TOÁN: KHÔNG BAO GIỜ xóa PENDING, FAILED, DEAD_LETTER hoặc TAMPERED.
   */
  async purgeOldRecords(prisma: any, options: RetentionPurgeOptions = {}): Promise<RetentionPurgeResult> {
    const olderThanDays = options.olderThanDays ?? 7;
    const batchSize = options.batchSize ?? 1000;
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    let totalPurgedOutbox = 0;
    let totalPurgedInbox = 0;

    try {
      // 1. Dọn dẹp Outbox: chỉ xóa PUBLISHED cũ
      if (prisma.outboxMessage) {
        const outboxToDelete = await prisma.outboxMessage.findMany({
          where: {
            status: 'PUBLISHED',
            createdAt: { lt: cutoffDate },
          },
          select: { id: true },
          take: batchSize,
        });

        if (outboxToDelete.length > 0) {
          const ids = outboxToDelete.map((row: { id: string }) => row.id);
          const res = await prisma.outboxMessage.deleteMany({
            where: { id: { in: ids } },
          });
          totalPurgedOutbox = res.count;
          this.logger.log(`[Retention] Đã xóa ${res.count} bản ghi Outbox (PUBLISHED) cũ hơn ${olderThanDays} ngày.`);
        }
      }

      // 2. Dọn dẹp Inbox: chỉ xóa PROCESSED cũ
      if (prisma.inboxMessage) {
        const inboxToDelete = await prisma.inboxMessage.findMany({
          where: {
            status: 'PROCESSED',
            createdAt: { lt: cutoffDate },
          },
          select: { id: true },
          take: batchSize,
        });

        if (inboxToDelete.length > 0) {
          const ids = inboxToDelete.map((row: { id: string }) => row.id);
          const res = await prisma.inboxMessage.deleteMany({
            where: { id: { in: ids } },
          });
          totalPurgedInbox = res.count;
          this.logger.log(`[Retention] Đã xóa ${res.count} bản ghi Inbox (PROCESSED) cũ hơn ${olderThanDays} ngày.`);
        }
      }
    } catch (error: any) {
      this.logger.error(`[Retention] Lỗi dọn dẹp dữ liệu cũ: ${error?.message || error}`);
      throw error;
    }

    return {
      purgedOutbox: totalPurgedOutbox,
      purgedInbox: totalPurgedInbox,
    };
  }
}

