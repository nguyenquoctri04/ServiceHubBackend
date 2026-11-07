import { BillingMaintenanceWorker } from './billing-maintenance.worker';
import { BillingEventPatterns, ProviderContractPatterns } from '@app/common';

describe('BillingMaintenanceWorker', () => {
  let worker: BillingMaintenanceWorker;
  let prisma: any;
  let retentionService: any;
  let outboxService: any;
  let secureRpc: any;
  let contractClient: any;

  beforeEach(() => {
    prisma = {
      invoice: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    retentionService = {
      purgeOldRecords: jest.fn().mockResolvedValue({ purgedOutbox: 5, purgedInbox: 3 }),
    };
    outboxService = {
      publishLocal: jest.fn().mockResolvedValue(undefined),
    };
    secureRpc = {
      send: jest.fn(),
    };
    contractClient = {};

    worker = new BillingMaintenanceWorker(
      prisma,
      retentionService,
      outboxService,
      secureRpc,
      contractClient,
    );
  });

  afterEach(() => {
    worker.onModuleDestroy();
  });

  describe('checkAndPurge', () => {
    it('calls retention service purge when hour is 2 AM and not yet purged today', async () => {
      // Mock Date to 2:30 AM
      const realDate = global.Date;
      const mockNow = new Date('2026-11-07T02:30:00.000Z');
      jest.spyOn(mockNow, 'getHours').mockReturnValue(2);
      global.Date = jest.fn(() => mockNow) as any;
      global.Date.now = jest.fn(() => mockNow.getTime());

      await worker.checkAndPurge();

      expect(retentionService.purgeOldRecords).toHaveBeenCalledWith(prisma, {
        olderThanDays: 7,
        batchSize: 1000,
      });

      // Second run on same day should skip
      await worker.checkAndPurge();
      expect(retentionService.purgeOldRecords).toHaveBeenCalledTimes(1);

      global.Date = realDate;
    });

    it('skips purge when hour is not 2 AM', async () => {
      const realDate = global.Date;
      const mockNow = new Date('2026-11-07T14:30:00.000Z');
      jest.spyOn(mockNow, 'getHours').mockReturnValue(14);
      global.Date = jest.fn(() => mockNow) as any;

      await worker.checkAndPurge();

      expect(retentionService.purgeOldRecords).not.toHaveBeenCalled();
      global.Date = realDate;
    });
  });

  describe('reconcileStaleInvoices', () => {
    it('re-publishes INVOICE_PAID event when contract is still PENDING_PAYMENT after 15m', async () => {
      const staleInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-1001',
        contractId: 'ctr-1',
        providerId: 'prv-1',
        customerId: 'cus-1',
        total: 5000000,
        revision: 1,
        updatedAt: new Date('2026-11-07T03:00:00.000Z'),
      };

      prisma.invoice.findMany.mockResolvedValueOnce([staleInvoice]);
      secureRpc.send.mockResolvedValueOnce({
        id: 'ctr-1',
        contractNumber: 'HD-2026-0001',
        status: 'PENDING_PAYMENT',
      });

      await worker.reconcileStaleInvoices();

      expect(secureRpc.send).toHaveBeenCalledWith(
        contractClient,
        { cmd: ProviderContractPatterns.FIND_ONE },
        { providerId: 'prv-1', contractId: 'ctr-1' },
        5000,
      );

      expect(outboxService.publishLocal).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          aggregateId: 'inv-1',
          aggregateRevision: 2,
          eventType: BillingEventPatterns.INVOICE_PAID,
          payload: expect.objectContaining({
            reconciled: true,
          }),
        }),
      );
    });

    it('does not re-publish when contract is already ACTIVE', async () => {
      const staleInvoice = {
        id: 'inv-2',
        contractId: 'ctr-2',
        providerId: 'prv-1',
        total: 3000000,
        revision: 1,
      };

      prisma.invoice.findMany.mockResolvedValueOnce([staleInvoice]);
      secureRpc.send.mockResolvedValueOnce({
        id: 'ctr-2',
        status: 'ACTIVE',
      });

      await worker.reconcileStaleInvoices();

      expect(outboxService.publishLocal).not.toHaveBeenCalled();
    });
  });
});

