import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from './outbox.service';
import { InboxService } from './inbox.service';
import { OutboxPollerService } from './outbox-poller.service';
import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';

describe('Saga & Transactional Outbox Reliability Infrastructure', () => {
  let outboxService: OutboxService;
  let inboxService: InboxService;
  let pollerService: OutboxPollerService;
  let mockBrokerClient: any;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OUTBOX_HMAC_SECRET' || key === 'HMAC_SECRET') {
        return 'test-secret-key-12345';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    mockBrokerClient = {
      emit: jest.fn().mockReturnValue(of(true)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        InboxService,
        OutboxPollerService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    outboxService = module.get<OutboxService>(OutboxService);
    inboxService = module.get<InboxService>(InboxService);
    pollerService = module.get<OutboxPollerService>(OutboxPollerService);
  });

  describe('1. OutboxService (Digital Signature & Tamper Detection)', () => {
    it('phải tạo chữ ký số HMAC-SHA256 nhất quán cho cùng một payload và metadata', () => {
      const now = new Date('2026-10-29T00:00:00.000Z');
      const sig1 = outboxService.computeSignature('contract.activated.v1', 'agg-1', 1, 'hash123', now);
      const sig2 = outboxService.computeSignature('contract.activated.v1', 'agg-1', 1, 'hash123', now);
      expect(sig1).toBeDefined();
      expect(sig1).toEqual(sig2);
    });

    it('phải phát hiện chữ ký hợp lệ khi bản ghi không bị thay đổi', () => {
      const now = new Date();
      const payload = { amount: 1500000, contractId: 'ctr-1' };
      const payloadHash = require('crypto').createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      const signature = outboxService.computeSignature('billing.invoice_paid.v1', 'inv-1', 1, payloadHash, now);

      const validRow: any = {
        eventType: 'billing.invoice_paid.v1',
        aggregateId: 'inv-1',
        aggregateRevision: 1,
        payload,
        rowSignature: signature,
        occurredAt: now,
      };

      expect(outboxService.verifySignature(validRow)).toBe(true);
    });

    it('phải phát hiện bản ghi bị can thiệp trái phép (Insider Threat / Tampering) khi payload bị sửa lén trong DB', () => {
      const now = new Date();
      const originalPayload = { amount: 1500000, contractId: 'ctr-1' };
      const payloadHash = require('crypto').createHash('sha256').update(JSON.stringify(originalPayload)).digest('hex');
      const signature = outboxService.computeSignature('billing.invoice_paid.v1', 'inv-1', 1, payloadHash, now);

      // Kẻ tấn công sửa amount từ 1.500.000 thành 500.000 trong DB
      const tamperedRow: any = {
        eventType: 'billing.invoice_paid.v1',
        aggregateId: 'inv-1',
        aggregateRevision: 1,
        payload: { amount: 500000, contractId: 'ctr-1' },
        rowSignature: signature,
        occurredAt: now,
      };

      expect(outboxService.verifySignature(tamperedRow)).toBe(false);
    });

    it('publishLocal phải lưu bản ghi với trạng thái PENDING và tự sinh orderingKey từ aggregateId nếu thiếu', async () => {
      const mockTx = {
        outboxMessage: {
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'out-1', ...data })),
        },
      };

      const result = await outboxService.publishLocal(mockTx, {
        eventType: 'contract.sent_for_signing.v1',
        aggregateType: 'Contract',
        aggregateId: 'ctr-100',
        aggregateRevision: 1,
        payload: { title: 'Hợp đồng thuê phòng' },
      });

      expect(mockTx.outboxMessage.create).toHaveBeenCalled();
      const createCall = mockTx.outboxMessage.create.mock.calls[0][0].data;
      expect(createCall.status).toBe('PENDING');
      expect(createCall.orderingKey).toBe('ctr-100');
      expect(createCall.rowSignature).toBeDefined();
    });
  });

  describe('2. InboxService (Deduplication & Idempotency)', () => {
    it('lần đầu nhận event phải claim thành công (trả về true)', async () => {
      const mockPrisma = {
        inboxMessage: {
          create: jest.fn().mockResolvedValue({ id: 'inbox-1' }),
        },
      };

      const result = await inboxService.claim(mockPrisma, {
        consumerName: 'contract-invoice-paid-consumer',
        eventId: 'evt-unique-1',
        eventType: 'billing.invoice_paid.v1',
        producer: 'billing-service',
      });

      expect(result).toBe(true);
      expect(mockPrisma.inboxMessage.create).toHaveBeenCalled();
    });

    it('khi broker gửi trùng lặp cùng một eventId, phải chặn lại (trả về false do vi phạm P2002)', async () => {
      const mockPrisma = {
        inboxMessage: {
          create: jest.fn().mockRejectedValue({ code: 'P2002', message: 'Unique constraint failed' }),
        },
      };

      const result = await inboxService.claim(mockPrisma, {
        consumerName: 'contract-invoice-paid-consumer',
        eventId: 'evt-duplicate-1',
        eventType: 'billing.invoice_paid.v1',
        producer: 'billing-service',
      });

      expect(result).toBe(false);
    });

    it('markProcessed phải cập nhật trạng thái PROCESSED', async () => {
      const mockPrisma = {
        inboxMessage: {
          update: jest.fn().mockResolvedValue({ status: 'PROCESSED' }),
        },
      };

      await inboxService.markProcessed(mockPrisma, 'consumer-1', 'evt-1');
      expect(mockPrisma.inboxMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PROCESSED' }),
        })
      );
    });

    it('markFailed phải cập nhật trạng thái FAILED', async () => {
      const mockPrisma = {
        inboxMessage: {
          update: jest.fn().mockResolvedValue({ status: 'FAILED' }),
        },
      };

      await inboxService.markFailed(mockPrisma, 'consumer-1', 'evt-1');
      expect(mockPrisma.inboxMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        })
      );
    });
  });

  describe('3. OutboxPollerService (Worker Polling & Backoff)', () => {
    it('khi bản ghi hợp lệ, phải phát tán qua ClientProxy và đánh dấu PUBLISHED', async () => {
      const now = new Date();
      const payload = { test: true };
      const payloadHash = require('crypto').createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      const signature = outboxService.computeSignature('test.event.v1', 'agg-1', 1, payloadHash, now);

      const pendingRow = {
        id: 'out-valid-1',
        eventType: 'test.event.v1',
        source: 'billing-service',
        subject: 'agg-1',
        orderingKey: 'agg-1',
        aggregateType: 'Invoice',
        aggregateId: 'agg-1',
        aggregateRevision: 1,
        payload,
        rowSignature: signature,
        occurredAt: now,
        attemptCount: 0,
      };

      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([pendingRow]),
        outboxMessage: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      await pollerService.processPendingMessages(mockPrisma, mockBrokerClient as ClientProxy);

      expect(mockBrokerClient.emit).toHaveBeenCalledWith(
        'test.event.v1',
        expect.objectContaining({
          id: 'out-valid-1',
          eventType: 'test.event.v1',
          aggregateId: 'agg-1',
        })
      );

      expect(mockPrisma.outboxMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'out-valid-1' },
          data: expect.objectContaining({ status: 'PUBLISHED' }),
        })
      );
    });

    it('khi bản ghi có chữ ký sai (bị can thiệp), KHÔNG được phát tán và phải gán nhãn TAMPERED', async () => {
      const tamperedRow = {
        id: 'out-tampered-1',
        eventType: 'test.event.v1',
        source: 'billing-service',
        subject: 'agg-1',
        orderingKey: 'agg-1',
        aggregateType: 'Invoice',
        aggregateId: 'agg-1',
        aggregateRevision: 1,
        payload: { fakeMoney: 999999999 },
        rowSignature: 'invalid-fake-signature',
        occurredAt: new Date(),
        attemptCount: 0,
      };

      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([tamperedRow]),
        outboxMessage: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      await pollerService.processPendingMessages(mockPrisma, mockBrokerClient as ClientProxy);

      // Tuyệt đối không được emit ra broker
      expect(mockBrokerClient.emit).not.toHaveBeenCalled();

      // Đánh dấu TAMPERED
      expect(mockPrisma.outboxMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'out-tampered-1' },
          data: expect.objectContaining({ status: 'TAMPERED' }),
        })
      );
    });
  });
});
