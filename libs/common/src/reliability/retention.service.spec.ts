import { ReliabilityRetentionService } from './retention.service';

describe('ReliabilityRetentionService', () => {
  let service: ReliabilityRetentionService;

  beforeEach(() => {
    service = new ReliabilityRetentionService();
  });

  it('purges only PUBLISHED outbox messages and PROCESSED inbox messages older than cutoff', async () => {
    const prisma = {
      outboxMessage: {
        findMany: jest.fn().mockResolvedValue([{ id: 'out-1' }, { id: 'out-2' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      inboxMessage: {
        findMany: jest.fn().mockResolvedValue([{ id: 'in-1' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const result = await service.purgeOldRecords(prisma, { olderThanDays: 7, batchSize: 500 });

    expect(prisma.outboxMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'PUBLISHED',
      }),
      take: 500,
    }));
    expect(prisma.outboxMessage.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['out-1', 'out-2'] } },
    });

    expect(prisma.inboxMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'PROCESSED',
      }),
      take: 500,
    }));
    expect(prisma.inboxMessage.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['in-1'] } },
    });

    expect(result).toEqual({ purgedOutbox: 2, purgedInbox: 1 });
  });

  it('handles empty results gracefully without calling deleteMany', async () => {
    const prisma = {
      outboxMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      inboxMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
    };

    const result = await service.purgeOldRecords(prisma);

    expect(prisma.outboxMessage.deleteMany).not.toHaveBeenCalled();
    expect(prisma.inboxMessage.deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual({ purgedOutbox: 0, purgedInbox: 0 });
  });
});

