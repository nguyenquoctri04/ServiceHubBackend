import { InvoicesService } from './invoices.service';
import { PaymentMethodDto } from '@app/common/dto/billing/pay-invoice.dto';

describe('InvoicesService', () => {
  const invoice = { id: 'invoice-1', providerId: 'provider-1', status: 'UNPAID', payments: [] };
  const payment = { id: 'payment-1', invoiceId: 'invoice-1', paymentLinkId: 'key-1', status: 'SUCCESS' };

  const makeService = (customPrisma?: any) => {
    const tx = {
      invoice: {
        findFirst: jest.fn().mockResolvedValue(invoice),
        findUnique: jest.fn().mockResolvedValue(invoice),
        update: jest.fn().mockResolvedValue({ ...invoice, revision: 2 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'fine-invoice-1', invoiceNumber: 'INV-FINE-001', total: 200000, status: 'UNPAID' }),
      },
      payment: {
        create: jest.fn().mockResolvedValue(payment),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = customPrisma ?? {
      invoice: { findFirst: jest.fn().mockResolvedValue({ id: invoice.id }) },
      payment: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const outboxService = { publishLocal: jest.fn().mockResolvedValue(undefined) };
    const inboxService = {
      claim: jest.fn().mockResolvedValue(true),
      markProcessed: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    return {
      service: new InvoicesService(
        prisma as any,
        outboxService as any,
        inboxService as any,
        { send: jest.fn().mockResolvedValue(undefined) } as any,
      ),
      prisma,
      tx,
      outboxService,
      inboxService,
    };
  };

  it('rejects an invoice outside the active provider workspace', async () => {
    const { service, prisma } = makeService();
    prisma.invoice.findFirst.mockResolvedValueOnce(null);

    await expect(service.payInvoice('provider-2', 'invoice-1', { paymentMethod: PaymentMethodDto.CASH }, 'key-1')).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns the existing payment when the same idempotency key is retried', async () => {
    const { service, prisma } = makeService();
    prisma.payment.findUnique.mockResolvedValueOnce(payment);

    await expect(service.payInvoice('provider-1', 'invoice-1', { paymentMethod: PaymentMethodDto.CASH }, 'key-1')).resolves.toEqual(payment);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updates the provider-owned unpaid invoice and writes the unique payment key once', async () => {
    const { service, tx } = makeService();

    await expect(service.payInvoice('provider-1', 'invoice-1', { paymentMethod: PaymentMethodDto.CASH }, 'key-1')).resolves.toEqual(payment);
    expect(tx.invoice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'invoice-1', providerId: 'provider-1', status: { in: ['UNPAID', 'OVERDUE'] } }),
    }));
    expect(tx.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ invoiceId: 'invoice-1', paymentLinkId: 'key-1', status: 'SUCCESS' }),
    }));
  });

  it('limits dashboard invoice reads to the requested provider-owned contracts', async () => {
    const prisma = {
      invoice: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    };
    const { service } = makeService(prisma);

    await service.findInvoices('provider-1', { contractIds: ['contract-1', 'contract-2'] } as any);

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ providerId: 'provider-1', contractId: { in: ['contract-1', 'contract-2'] } }),
    }));
  });

  it('returns outstanding totals grouped by provider-owned contract', async () => {
    const prisma = {
      invoice: { groupBy: jest.fn().mockResolvedValue([{ contractId: 'contract-1', _sum: { total: 350000 } }]) },
    };
    const { service } = makeService(prisma);

    await expect(service.findOutstandingTotals('provider-1', ['contract-1'])).resolves.toEqual({ 'contract-1': 350000 });
    expect(prisma.invoice.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { providerId: 'provider-1', contractId: { in: ['contract-1'] }, status: { in: ['UNPAID', 'OVERDUE'] } },
    }));
  });

  it('calculates invoice aging percentages correctly', async () => {
    const prisma = {
      invoice: {
        groupBy: jest.fn().mockResolvedValue([
          { status: 'PAID', _sum: { total: 500000 } },
          { status: 'UNPAID', _sum: { total: 300000 } },
          { status: 'OVERDUE', _sum: { total: 200000 } },
        ]),
      },
    };
    const { service } = makeService(prisma);

    const result = await service.getInvoiceAging('provider-1');
    expect(result).toMatchObject({ paid: 50, unpaid: 30, overdue: 20, paidAmount: 500000, unpaidAmount: 300000, overdueAmount: 200000, totalAmount: 1000000 });
    expect(prisma.invoice.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { providerId: 'provider-1' },
    }));
  });

  it('handles empty invoice aging correctly', async () => {
    const prisma = {
      invoice: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const { service } = makeService(prisma);

    await expect(service.getInvoiceAging('provider-1')).resolves.toMatchObject({ paid: 0, unpaid: 0, overdue: 0 });
  });

  it('fetches recent payments correctly', async () => {
    const prisma = {
      payment: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', invoice: { invoiceNumber: 'INV-1' }, createdAt: new Date('2026-10-01') },
        ]),
      },
    };
    const { service } = makeService(prisma);

    const result = await service.getRecentPayments('provider-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ title: 'Thanh toán thành công', description: 'HĐ số INV-1' }));
  });

  describe('handleContractActivationFailedEvent', () => {
    it('claims inbox, marks refund requested, increments revision and marks processed', async () => {
      const { service, inboxService, outboxService, tx } = makeService();

      const envelope: any = {
        id: 'evt-fail-1',
        eventType: 'contract.activation_failed.v1',
        source: 'contract-service',
        orderingKey: 'contract-1',
        payload: {
          contractId: 'contract-1',
          invoiceId: 'invoice-1',
          reason: 'Thiếu chữ ký số điện tử hợp lệ.',
        },
      };

      await service.handleContractActivationFailedEvent(envelope);

      expect(inboxService.claim).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        consumerName: 'billing-contract-activation-failed-consumer',
        eventId: 'evt-fail-1',
      }));
      expect(tx.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'invoice-1' },
      }));
      expect(outboxService.publishLocal).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        eventType: 'billing.refund_requested.v1',
      }));
      expect(inboxService.markProcessed).toHaveBeenCalledWith(expect.anything(), 'billing-contract-activation-failed-consumer', 'evt-fail-1');
    });
  });

  describe('handleViolationFineImposedEvent', () => {
    it('claims inbox, creates unpaid fine invoice and emits fine invoice created event', async () => {
      const { service, inboxService, outboxService, tx } = makeService();

      const envelope: any = {
        id: 'evt-fine-1',
        eventType: 'violation.fine_imposed.v1',
        source: 'contract-service',
        orderingKey: 'contract-1',
        payload: {
          violationCaseId: 'viol-case-12345678',
          contractId: 'contract-1',
          providerId: 'provider-1',
          customerId: 'customer-1',
          fineAmount: 500000,
          reason: 'Gây ồn ào quá 23h',
        },
      };

      tx.invoice.findFirst.mockResolvedValueOnce(null); // No existing fine

      await service.handleViolationFineImposedEvent(envelope);

      expect(inboxService.claim).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        consumerName: 'billing-violation-fine-consumer',
        eventId: 'evt-fine-1',
      }));
      expect(tx.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          total: 500000,
          status: 'UNPAID',
        }),
      }));
      expect(outboxService.publishLocal).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        eventType: 'billing.fine_invoice_created.v1',
      }));
      expect(inboxService.markProcessed).toHaveBeenCalledWith(expect.anything(), 'billing-violation-fine-consumer', 'evt-fine-1');
    });
  });
});
