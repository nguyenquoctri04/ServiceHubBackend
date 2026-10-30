import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { PublishOutboxOptions, OutboxMessageRow } from './reliability.types';

/**
 * Chuẩn hóa JSON đệ quy sắp xếp key theo alphabet (Canonical JSON).
 * Ngăn chặn lỗi lệch mã hash do PostgreSQL JSONB tự động hoán đổi thứ tự các thuộc tính.
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalizeJson(obj[k])).join(',') + '}';
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly hmacSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.hmacSecret =
      this.configService.get<string>('OUTBOX_HMAC_SECRET') ||
      this.configService.get<string>('HMAC_SECRET') ||
      'servicehub-outbox-internal-key-change-in-prod';
  }

  /**
   * Tính toán chữ ký HMAC cho bản ghi Outbox nhằm chống can thiệp trực tiếp từ SQL Console.
   */
  computeSignature(
    eventType: string,
    aggregateId: string,
    aggregateRevision: number,
    payloadHash: string,
    occurredAt: Date | string,
  ): string {
    const occurredAtIso = typeof occurredAt === 'string' ? new Date(occurredAt).toISOString() : occurredAt.toISOString();
    const raw = `${eventType}:${aggregateId}:${aggregateRevision}:${payloadHash}:${occurredAtIso}`;
    return createHmac('sha256', this.hmacSecret).update(raw).digest('hex');
  }

  /**
   * Xác thực tính toàn vẹn của một dòng Outbox.
   */
  verifySignature(row: OutboxMessageRow): boolean {
    if (!row.rowSignature) return false;
    const payloadJson = typeof row.payload === 'string' ? row.payload : canonicalizeJson(row.payload);
    const payloadHash = createHash('sha256').update(payloadJson).digest('hex');
    const expected = this.computeSignature(
      row.eventType,
      row.aggregateId,
      row.aggregateRevision,
      payloadHash,
      new Date(row.occurredAt),
    );
    try {
      return timingSafeEqual(Buffer.from(row.rowSignature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /**
   * Ghi sự kiện vào bảng outbox_message trong cùng Local Transaction của Prisma.
   */
  async publishLocal(
    tx: any,
    options: PublishOutboxOptions,
  ): Promise<OutboxMessageRow> {
    const now = new Date();
    const revision = options.aggregateRevision ?? 1;
    const payloadJson = typeof options.payload === 'string' ? options.payload : canonicalizeJson(options.payload);
    const payloadHash = createHash('sha256').update(payloadJson).digest('hex');
    const rowSignature = this.computeSignature(
      options.eventType,
      options.aggregateId,
      revision,
      payloadHash,
      now,
    );

    const data = {
      specVersion: '1.0',
      eventType: options.eventType,
      source: options.source || 'servicehub.internal',
      subject: options.subject || options.aggregateId,
      orderingKey: options.orderingKey ? String(options.orderingKey) : options.aggregateId,
      aggregateType: options.aggregateType,
      aggregateId: options.aggregateId,
      aggregateRevision: revision,
      payload: options.payload,
      rowSignature,
      status: 'PENDING',
      attemptCount: 0,
      maxAttempts: 5,
      nextAttemptAt: now,
      correlationId: options.correlationId || null,
      occurredAt: now,
    };

    return tx.outboxMessage.create({ data });
  }
}
