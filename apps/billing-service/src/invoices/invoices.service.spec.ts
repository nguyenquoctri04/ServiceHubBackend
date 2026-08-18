import { InvoicesService } from './invoices.service';
import { PaymentMethodDto } from '@app/common/dto/billing/pay-invoice.dto';

describe('InvoicesService', () => {
  const invoice = { id: 'invoice-1', providerId: 'provider-1', status: 'UNPAID', payments: [] };
  const payment = { id: 'payment-1', invoiceId: 'invoice-1', paymentLinkId: 'key-1', status: 'SUCCESS' };

  const makeService = () => {
    const tx = {
      invoice: {
        findFirst: jest.fn().mockResolvedValue(invoice),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: { create: jest.fn().mockResolvedValue(payment) },
    };
    const prisma = {
      invoice: { findFirst: jest.fn().mockResolvedValue({ id: invoice.id }) },
      payment: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    return { service: new InvoicesService(prisma as any), prisma, tx };
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
    const service = new InvoicesService(prisma as any);

    await service.findInvoices('provider-1', { contractIds: ['contract-1', 'contract-2'] } as any);

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ providerId: 'provider-1', contractId: { in: ['contract-1', 'contract-2'] } }),
    }));
  });

  it('returns outstanding totals grouped by provider-owned contract', async () => {
    const prisma = {
      invoice: { groupBy: jest.fn().mockResolvedValue([{ contractId: 'contract-1', _sum: { total: 350000 } }]) },
    };
    const service = new InvoicesService(prisma as any);

    await expect(service.findOutstandingTotals('provider-1', ['contract-1'])).resolves.toEqual({ 'contract-1': 350000 });
    expect(prisma.invoice.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { providerId: 'provider-1', contractId: { in: ['contract-1'] }, status: { in: ['UNPAID', 'OVERDUE'] } },
    }));
  });
});
