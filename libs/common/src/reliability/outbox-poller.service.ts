import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OutboxService } from './outbox.service';
import { OutboxMessageRow, EventEnvelope } from './reliability.types';

@Injectable()
export class OutboxPollerService {
  private readonly logger = new Logger(OutboxPollerService.name);

  constructor(private readonly outboxService: OutboxService) {}

  /**
   * Quét và phát các bản ghi Outbox đang chờ xử lý.
   * Sử dụng cú pháp raw query: SELECT ... FOR UPDATE SKIP LOCKED an toàn 100% trong Postgres.
   */
  async processPendingMessages(
    prisma: any,
    clientProxy: ClientProxy,
    batchSize = 50,
  ): Promise<number> {
    const now = new Date();

    // 1. Quét các dòng PENDING chưa bị khóa bởi worker khác
    const pendingRows: OutboxMessageRow[] = await prisma.$queryRaw`
      SELECT 
        id, spec_version as "specVersion", event_type as "eventType", source, subject,
        ordering_key as "orderingKey", aggregate_type as "aggregateType", aggregate_id as "aggregateId",
        aggregate_revision as "aggregateRevision", payload, row_signature as "rowSignature",
        status, attempt_count as "attemptCount", max_attempts as "maxAttempts",
        next_attempt_at as "nextAttemptAt", last_error_code as "lastErrorCode",
        last_error_message as "lastErrorMessage", correlation_id as "correlationId",
        occurred_at AT TIME ZONE 'UTC' as "occurredAt", published_at as "publishedAt"
      FROM outbox_message
      WHERE status = 'PENDING' AND next_attempt_at <= ${now}
      ORDER BY occurred_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED;
    `;

    if (!pendingRows || pendingRows.length === 0) {
      return 0;
    }

    let processedCount = 0;

    for (const row of pendingRows) {
      // 2. Chống Insider Threat: Kiểm tra chữ ký HMAC
      const isSignatureValid = this.outboxService.verifySignature(row);
      if (!isSignatureValid) {
        this.logger.error(
          `[SECURITY ALERT] Phát hiện bản ghi Outbox ${row.id} có chữ ký HMAC không hợp lệ! Nghi vấn can thiệp DB trực tiếp.`,
        );
        await prisma.outboxMessage.update({
          where: { id: row.id },
          data: {
            status: 'TAMPERED',
            lastErrorCode: 'INVALID_ROW_SIGNATURE',
            lastErrorMessage: 'Chữ ký số nội bộ của dòng dữ liệu không khớp.',
          },
        });
        continue;
      }

      // 3. Đóng gói Event Envelope theo chuẩn CloudEvents
      const envelope: EventEnvelope = {
        id: row.id,
        specVersion: row.specVersion || '1.0',
        eventType: row.eventType,
        source: row.source,
        subject: row.subject,
        orderingKey: row.orderingKey,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        aggregateRevision: row.aggregateRevision,
        payload: row.payload,
        correlationId: row.correlationId || undefined,
        occurredAt: new Date(row.occurredAt).toISOString(),
      };

      try {
        // 4. Phát tán sự kiện qua Message Broker
        clientProxy.emit(row.eventType, envelope);

        // 5. Cập nhật thành công (PUBLISHED)
        await prisma.outboxMessage.update({
          where: { id: row.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });

        processedCount++;
      } catch (error: any) {
        // 6. Xử lý lỗi & Exponential Backoff
        const nextAttemptCount = row.attemptCount + 1;
        const isDeadLetter = nextAttemptCount >= row.maxAttempts;
        const delayMs = Math.min(Math.pow(2, row.attemptCount) * 1000, 60000); // Tối đa 60s
        const nextAttemptAt = new Date(Date.now() + delayMs);

        this.logger.warn(
          `[OutboxPoller] Thất bại khi phát event ${row.id} (${row.eventType}). Lần thử: ${nextAttemptCount}/${row.maxAttempts}. Lỗi: ${error?.message}`,
        );

        await prisma.outboxMessage.update({
          where: { id: row.id },
          data: {
            attemptCount: nextAttemptCount,
            nextAttemptAt,
            status: isDeadLetter ? 'DEAD_LETTER' : 'PENDING',
            lastErrorCode: error?.name || 'EMIT_ERROR',
            lastErrorMessage: error?.message || String(error),
          },
        });
      }
    }

    return processedCount;
  }
}
