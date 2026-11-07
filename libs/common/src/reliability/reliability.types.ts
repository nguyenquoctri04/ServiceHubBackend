export interface OutboxMessageRow {
  id: string;
  specVersion: string;
  eventType: string;
  source: string;
  subject: string;
  orderingKey: string;
  aggregateType: string;
  aggregateId: string;
  aggregateRevision: number;
  payload: any;
  rowSignature?: string | null;
  status: 'PENDING' | 'PUBLISHED' | 'DEAD_LETTER' | 'TAMPERED';
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  correlationId?: string | null;
  occurredAt: Date;
  publishedAt?: Date | null;
}

export interface PublishOutboxOptions<T = any> {
  eventType: string;
  source?: string;
  subject?: string;
  orderingKey?: string;
  aggregateType: string;
  aggregateId: string;
  aggregateRevision?: number;
  payload: T;
  correlationId?: string;
}

export interface InboxClaimOptions {
  consumerName: string;
  eventId: string;
  eventType: string;
  producer?: string;
  orderingKey?: string;
  payloadHash?: string;
}

export interface EventEnvelope<T = any> {
  id: string;
  specVersion: string;
  eventType: string;
  source: string;
  subject: string;
  orderingKey: string;
  aggregateType: string;
  aggregateId: string;
  aggregateRevision: number;
  payload: T;
  correlationId?: string;
  occurredAt: string;
}
