import { Injectable, Optional, ConflictException, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto, PaymentMethodDto } from '@app/common/dto/billing/pay-invoice.dto';
import { Prisma, type LedgerStatus, type LedgerType } from '@prisma/client-billing';
import { PaymentsService } from '../payments/payments.service';
import { OutboxService, InboxService, BillingEventPatterns, EventEnvelope } from '@app/common';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly inboxService: InboxService,
    @Optional() private readonly paymentsService?: PaymentsService,
  ) { }

  // ─── Provider: danh sách hóa đơn ─────────────────────────────────────────
  async findInvoices(providerId: string, query: InvoiceQueryDto) {
    const where: Prisma.InvoiceWhereInput = {
      providerId,
    };

    if (query.status) {
      where.status = query.status as any;
    }

    if (query.search) {
      const orConditions: Prisma.InvoiceWhereInput[] = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
      ];
      if (query.contractIds?.length) {
        orConditions.push({ contractId: { in: query.contractIds } });
      }
      if (query.customerIds?.length) {
        orConditions.push({ customerId: { in: query.customerIds } });
      }
      where.OR = orConditions;
    } else {
      if (query.contractIds?.length) {
        where.contractId = { in: query.contractIds };
      }
      if (query.customerIds?.length) {
        where.customerId = { in: query.customerIds };
      }
    }

    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payments: true },
      }),
    ]);

    return { data, total, page, limit };
  }

  async getRevenueSummary(providerId: string) {
    const totals = await this.prisma.ledger.groupBy({
      by: ['type', 'status'],
      where: { providerId },
      _sum: { amount: true },
    });

    const sum = (type: LedgerType, statuses: LedgerStatus[]) =>
      totals
        .filter((row) => row.type === type && statuses.includes(row.status))
        .reduce((value, row) => value + Number(row._sum.amount ?? 0), 0);

    const collected = sum('INCOME', ['SUCCEEDED']);
    const sent = sum('PAYOUT', ['SUCCEEDED']);
    const refunded = sum('REFUND', ['SUCCEEDED']);
    const reserved = sum('PAYOUT', ['PENDING', 'PROCESSING', 'UNKNOWN']);

    return {
      currency: 'VND',
      totalCollected: collected,
      totalSent: sent,
      totalRefunded: refunded,
      pendingPayout: reserved,
      availableBalance: collected - sent - refunded - reserved,
    };
  }

  async getRevenueTransactions(
    providerId: string,
    query: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
      search?: string;
    },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const search = query.search?.trim();
    const where: Prisma.LedgerWhereInput = {
      providerId,
      ...(query.type ? { type: query.type as LedgerType } : {}),
      ...(query.status ? { status: query.status as LedgerStatus } : {}),
      ...(search
        ? {
          OR: [
            { referenceId: { contains: search, mode: 'insensitive' } },
            {
              invoice: {
                is: {
                  invoiceNumber: { contains: search, mode: 'insensitive' },
                },
              },
            },
          ],
        }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.ledger.count({ where }),
      this.prisma.ledger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          invoice: {
            select: { id: true, invoiceNumber: true, customerId: true },
          },
          payoutBatch: {
            select: { id: true, batchId: true, status: true },
          },
        },
      }),
    ]);

    return {
      data: rows.map((row) => ({ ...row, amount: Number(row.amount) })),
      total,
      page,
      limit,
    };
  }

  // ─── Provider: tổng nợ đọng theo hợp đồng ─────────────────────────────────
  async findOutstandingTotals(providerId: string, contractIds: string[]): Promise<Record<string, number>> {
    if (contractIds.length === 0) return {};

    const totals = await this.prisma.invoice.groupBy({
      by: ['contractId'],
      where: { providerId, contractId: { in: contractIds }, status: { in: ['UNPAID', 'OVERDUE'] } },
      _sum: { total: true },
    });
    return Object.fromEntries(totals.flatMap((total) =>
      total.contractId ? [[total.contractId, Number(total._sum.total ?? 0)] as const] : [],
    ));
  }

  // ─── Provider: thống kê tổng quan dashboard ──────────────────────────────
  async getDashboardStats(providerId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [monthlyInvoices, unpaidInvoices] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          providerId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          providerId,
          status: { in: ['UNPAID', 'OVERDUE'] },
        },
        _sum: { total: true },
      }),
    ]);

    let monthlyRevenue = Number(monthlyInvoices._sum.total ?? 0);
    if (monthlyRevenue === 0) {
      const latestInvoice = await this.prisma.invoice.findFirst({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      if (latestInvoice) {
        const latestMonthStart = new Date(latestInvoice.createdAt.getFullYear(), latestInvoice.createdAt.getMonth(), 1);
        const latestMonthEnd = new Date(latestInvoice.createdAt.getFullYear(), latestInvoice.createdAt.getMonth() + 1, 0, 23, 59, 59);
        const latestAggregate = await this.prisma.invoice.aggregate({
          where: {
            providerId,
            createdAt: { gte: latestMonthStart, lte: latestMonthEnd },
          },
          _sum: { total: true },
        });
        monthlyRevenue = Number(latestAggregate._sum.total ?? 0);
      }
    }

    return {
      monthlyRevenue,
      unpaidRevenue: Number(unpaidInvoices._sum.total ?? 0),
    };
  }

  // ─── Provider: thanh toán hóa đơn (Idempotent & Concurrency Safe) ────────
  async payInvoice(
    providerId: string,
    invoiceId: string,
    dto: PayInvoiceDto,
    idempotencyKey: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, providerId },
    });
    if (!invoice) throw new RpcException(new NotFoundException('Không tìm thấy hóa đơn'));

    if (idempotencyKey) {
      const previousPayment = await this.prisma.payment.findUnique({
        where: { paymentLinkId: idempotencyKey },
      });
      if (previousPayment) {
        if (previousPayment.invoiceId === invoiceId) return previousPayment;
        throw new RpcException(new ConflictException('Idempotency-Key đã được dùng cho hóa đơn khác'));
      }
    }

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const currentInvoice = await tx.invoice.findFirst({
            where: { id: invoiceId, providerId },
            include: { payments: { where: { status: 'PENDING' }, select: { id: true } } },
          });
          if (!currentInvoice) throw new RpcException(new NotFoundException('Không tìm thấy hóa đơn'));
          if (currentInvoice.status === 'PAID') throw new RpcException(new ConflictException('Hóa đơn đã được thanh toán'));

          // Nếu có giao dịch online đang PENDING, đánh dấu FAILED để giải phóng hóa đơn
          if (currentInvoice.payments && currentInvoice.payments.length > 0) {
            await tx.payment.updateMany({
              where: { invoiceId, status: 'PENDING' },
              data: { status: 'FAILED' },
            });
          }

          const now = new Date();
          const updated = await tx.invoice.updateMany({
            where: { id: invoiceId, providerId, status: { in: ['UNPAID', 'OVERDUE'] } },
            data: { status: 'PAID', revision: { increment: 1 }, updatedAt: now },
          });
          if (updated.count !== 1) {
            throw new RpcException(new ConflictException('Hóa đơn không còn ở trạng thái có thể thanh toán'));
          }

          const payment = await tx.payment.create({
            data: {
              invoiceId,
              paymentMethod: 'CASH',
              paymentLinkId: idempotencyKey || null,
              status: 'SUCCESS',
              paidAt: now,
              createdAt: now,
            },
          });

          // Ghi Outbox sự kiện thanh toán hóa đơn (để kích hoạt hợp đồng & thông báo)
          if (currentInvoice.contractId) {
            await this.outboxService.publishLocal(tx, {
              eventType: BillingEventPatterns.INVOICE_PAID,
              aggregateType: 'INVOICE',
              aggregateId: invoiceId,
              aggregateRevision: (currentInvoice.revision || 1) + 1,
              orderingKey: currentInvoice.contractId,
              payload: {
                invoiceId,
                invoiceNumber: currentInvoice.invoiceNumber,
                contractId: currentInvoice.contractId,
                customerId: currentInvoice.customerId,
                providerId,
                amount: Number(currentInvoice.total),
                paymentMethod: 'CASH',
                paidAt: now,
              },
            });
          }

          return { payment, contractId: currentInvoice.contractId };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return result.payment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        if (idempotencyKey) {
          const duplicate = await this.prisma.payment.findUnique({ where: { paymentLinkId: idempotencyKey } });
          if (duplicate?.invoiceId === invoiceId) return duplicate;
        }
      }
      throw error;
    }
  }

  // ─── Provider: biểu đồ tăng trưởng 6 tháng ───────────────────────────────
  async getRevenueGrowth(providerId: string) {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { monthIndex: d.getMonth(), year: d.getFullYear(), label: `T${d.getMonth() + 1}` };
    });

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    const paidInvoices = await this.prisma.invoice.findMany({
      where: {
        providerId,
        status: 'PAID',
        OR: [
          { updatedAt: { gte: sixMonthsAgo } },
          { createdAt: { gte: sixMonthsAgo } },
        ],
      },
      select: { total: true, updatedAt: true, createdAt: true },
    });

    return months.map((m) => {
      const total = paidInvoices
        .filter((inv) => {
          const targetDate = inv.updatedAt || inv.createdAt;
          return targetDate.getMonth() === m.monthIndex && targetDate.getFullYear() === m.year;
        })
        .reduce((sum, inv) => sum + Number(inv.total), 0);
      return { month: m.label, total };
    });
  }

  // ─── Provider: phân bổ tuổi nợ ───────────────────────────────────────────
  async getInvoiceAging(providerId: string) {
    const stats = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: { providerId },
      _sum: { total: true },
    });

    let paidAmount = 0;
    let unpaidAmount = 0;
    let overdueAmount = 0;

    stats.forEach((s) => {
      const amount = Number(s._sum.total ?? 0);
      if (s.status === 'PAID') paidAmount = amount;
      if (s.status === 'UNPAID') unpaidAmount = amount;
      if (s.status === 'OVERDUE') overdueAmount = amount;
    });

    const totalAmount = paidAmount + unpaidAmount + overdueAmount;
    if (totalAmount === 0) {
      return {
        paid: 0,
        unpaid: 0,
        overdue: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        overdueAmount: 0,
        totalAmount: 0,
      };
    }

    const paidPct = Math.round((paidAmount / totalAmount) * 100);
    const unpaidPct = Math.round((unpaidAmount / totalAmount) * 100);
    const overduePct = Math.max(0, 100 - paidPct - unpaidPct);

    return {
      paid: paidPct,
      unpaid: unpaidPct,
      overdue: overduePct,
      paidAmount,
      unpaidAmount,
      overdueAmount,
      totalAmount,
    };
  }

  // ─── Provider: lịch sử hoạt động thanh toán & công tơ gần nhất ─────────────
  async getRecentPayments(providerId: string) {
    const paymentPromise = this.prisma.payment.findMany({
      where: {
        invoice: { providerId },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        paidAt: true,
        createdAt: true,
        invoice: { select: { invoiceNumber: true } },
      },
    });

    const readingPromise = this.prisma.meterReading
      ? this.prisma.meterReading.findMany({
        where: {
          meter: { providerId },
          status: 'VALID',
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: {
          id: true,
          value: true,
          createdAt: true,
          meter: { select: { name: true, unit: true } },
        },
      })
      : Promise.resolve([]);

    const overduePromise = this.prisma.invoice
      ? this.prisma.invoice.findMany({
        where: {
          providerId,
          status: 'OVERDUE',
        },
        orderBy: { updatedAt: 'desc' },
        take: 2,
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          updatedAt: true,
          createdAt: true,
        },
      })
      : Promise.resolve([]);

    const [payments, readings, overdueInvoices] = await Promise.all([paymentPromise, readingPromise, overduePromise]);

    const paymentActivities = payments.map((p) => {
      let title = 'Thanh toán thành công';
      let color = '#10B981';

      if (p.status === 'FAILED') {
        title = 'Thanh toán thất bại';
        color = '#EF4444';
      } else if (p.status === 'PENDING') {
        title = 'Giao dịch đang xử lý';
        color = '#F59E0B';
      }

      return {
        id: p.id,
        type: 'PAYMENT',
        title,
        description: `HĐ số ${p.invoice?.invoiceNumber || ''}`,
        timestamp: p.paidAt || p.createdAt,
        color,
        actionUrl: '/provider/billing',
      };
    });

    const readingActivities = (readings || []).map((r) => ({
      id: r.id,
      type: 'METER',
      title: 'Đã ghi chỉ số công tơ',
      description: `${r.meter?.name || 'Công tơ'}: ${Number(r.value)} ${r.meter?.unit || ''}`,
      timestamp: r.createdAt,
      color: '#06B6D4',
      actionUrl: '/provider/meters',
    }));

    const overdueActivities = (overdueInvoices || []).map((inv) => ({
      id: inv.id,
      type: 'INVOICE_OVERDUE',
      title: 'Hóa đơn quá hạn thanh toán',
      description: `HĐ số ${inv.invoiceNumber} • Nợ: ${Number(inv.total).toLocaleString('vi-VN')}đ`,
      timestamp: inv.updatedAt || inv.createdAt,
      color: '#EF4444',
      actionUrl: '/provider/billing',
    }));

    return [...paymentActivities, ...readingActivities, ...overdueActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }

  // ─── Customer: danh sách hóa đơn ─────────────────────────────────────────
  // async findCustomerInvoices(customerId: string, query: InvoiceQueryDto) {
  //   const where: Prisma.InvoiceWhereInput = { customerId };
  //   if (query.status) where.status = query.status as any;
  //   if (query.search) where.invoiceNumber = { contains: query.search, mode: 'insensitive' };

  //   const page  = query.page  ? Number(query.page)  : 1;
  //   const limit = query.limit ? Number(query.limit) : 10;
  //   const skip  = (page - 1) * limit;

  //   const [total, data] = await Promise.all([
  //     this.prisma.invoice.count({ where }),
  //     this.prisma.invoice.findMany({
  //       where, skip, take: limit,
  //       orderBy: { createdAt: 'desc' },
  //       include: { items: true, payments: true },
  //     }),
  //   ]);

  //   return { data, total, page, limit };
  // }

  // ─── Customer: chi tiết hóa đơn ──────────────────────────────────────────
  // async findOneCustomerInvoice(customerId: string, invoiceId: string) {
  //   const invoice = await this.prisma.invoice.findFirst({
  //     where: { id: invoiceId, customerId },
  //     include: { items: true, payments: true },
  //   });
  //   if (!invoice) throw new RpcException(new NotFoundException('Invoice not found'));
  //   return invoice;
  // }

  // ─── Customer: thanh toán hóa đơn ────────────────────────────────────────
  // async customerPayInvoice(
  //   customerId: string,
  //   invoiceId: string,
  //   dto: PayInvoiceDto,
  //   ipAddr?: string,
  // ) {
  //   const invoice = await this.prisma.invoice.findFirst({
  //     where: { id: invoiceId, customerId },
  //     include: { payments: true },
  //   });
  //   if (!invoice) throw new RpcException(new NotFoundException('Invoice not found'));
  //   if (invoice.status === 'PAID')
  //     throw new RpcException(new ConflictException('Invoice is already paid'));

  //   return this.processPayment(invoice, dto, ipAddr);
  // }



  // ─── Provider: nhắc nợ hóa đơn ───────────────────────────────────────────
  async remindInvoice(providerId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, providerId },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        status: true,
        customerId: true,
        contractId: true,
      },
    });
    if (!invoice) {
      throw new RpcException(new NotFoundException('Không tìm thấy hóa đơn'));
    }
    if (invoice.status === 'PAID') {
      throw new RpcException(new ConflictException('Hóa đơn đã được thanh toán, không cần nhắc nợ'));
    }
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: Number(invoice.total),
      customerId: invoice.customerId,
      contractId: invoice.contractId,
      status: invoice.status,
    };
  }

  /**
   * Xử lý sự kiện Hợp đồng bị hủy (contract.cancelled.v1) từ Contract Service thông qua Inbox (Saga Step)
   */
  async handleContractCancelledEvent(envelope: EventEnvelope<{ contractId: string }>) {
    const claimed = await this.inboxService.claim(this.prisma, {
      consumerName: 'billing-contract-cancelled-consumer',
      eventId: envelope.id,
      eventType: envelope.eventType,
      producer: envelope.source,
      orderingKey: envelope.orderingKey,
    });
    if (!claimed) return;

    try {
      const contractId = envelope.payload?.contractId || envelope.aggregateId;
      if (contractId) {
        const invoices = await this.prisma.invoice.findMany({
          where: { contractId, status: { not: 'PAID' } },
          select: { id: true },
        });
        const ids = invoices.map((i) => i.id);
        if (ids.length > 0) {
          await this.prisma.$transaction([
            this.prisma.payment.deleteMany({ where: { invoiceId: { in: ids } } }),
            this.prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: ids } } }),
            this.prisma.invoice.deleteMany({ where: { id: { in: ids } } }),
          ]);
        }
      }
      await this.inboxService.markProcessed(this.prisma, 'billing-contract-cancelled-consumer', envelope.id);
    } catch (error) {
      await this.inboxService.markFailed(this.prisma, 'billing-contract-cancelled-consumer', envelope.id);
      throw error;
    }
  }

  /**
   * Xử lý sự kiện Kích hoạt hợp đồng thất bại (contract.activation_failed.v1)
   * Treo hoàn tiền và bù trừ công nợ (Saga Compensation Step)
   */
  async handleContractActivationFailedEvent(envelope: EventEnvelope<{ contractId: string; invoiceId?: string; reason?: string }>) {
    const consumerName = 'billing-contract-activation-failed-consumer';
    const claimed = await this.inboxService.claim(this.prisma, {
      consumerName,
      eventId: envelope.id,
      eventType: envelope.eventType,
      producer: envelope.source,
      orderingKey: envelope.orderingKey,
    });
    if (!claimed) return;

    try {
      const { contractId, invoiceId, reason } = envelope.payload || {};
      const targetInvoiceId = invoiceId || envelope.aggregateId;

      await this.prisma.$transaction(async (tx) => {
        let invoice = targetInvoiceId
          ? await tx.invoice.findUnique({ where: { id: targetInvoiceId }, include: { payments: true } })
          : null;

        if (!invoice && contractId) {
          invoice = await tx.invoice.findFirst({
            where: { contractId, status: 'PAID' },
            orderBy: { updatedAt: 'desc' },
            include: { payments: true },
          });
        }

        if (!invoice) return;

        const nextRevision = (invoice.revision || 1) + 1;
        const updatedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            revision: nextRevision,
            updatedAt: new Date(),
          },
        });

        if (invoice.payments && invoice.payments.length > 0) {
          await tx.payment.updateMany({
            where: { invoiceId: invoice.id, status: 'SUCCESS' },
            data: { status: 'FAILED' },
          });
        }

        await this.outboxService.publishLocal(tx, {
          aggregateType: 'Invoice',
          aggregateId: updatedInvoice.id,
          aggregateRevision: nextRevision,
          eventType: BillingEventPatterns.REFUND_REQUESTED,
          payload: {
            invoiceId: updatedInvoice.id,
            invoiceNumber: updatedInvoice.invoiceNumber,
            contractId: updatedInvoice.contractId,
            customerId: updatedInvoice.customerId,
            providerId: updatedInvoice.providerId,
            amount: Number(updatedInvoice.total),
            reason: reason || 'Kích hoạt hợp đồng thất bại do không đủ chữ ký số hợp lệ.',
            status: 'REFUND_PENDING',
            refundRequestedAt: new Date().toISOString(),
          },
        });
      });

      await this.inboxService.markProcessed(this.prisma, consumerName, envelope.id);
    } catch (error) {
      await this.inboxService.markFailed(this.prisma, consumerName, envelope.id);
      throw error;
    }
  }

  /**
   * Xử lý sự kiện Phạt vi phạm (violation.fine_imposed.v1) từ Contract Service
   * Tự động sinh hóa đơn công nợ phạt (UNPAID)
   */
  async handleViolationFineImposedEvent(envelope: EventEnvelope<{
    violationCaseId: string;
    contractId?: string;
    providerId: string;
    customerId: string;
    fineAmount?: number;
    reason?: string;
  }>) {
    const consumerName = 'billing-violation-fine-consumer';
    const claimed = await this.inboxService.claim(this.prisma, {
      consumerName,
      eventId: envelope.id,
      eventType: envelope.eventType,
      producer: envelope.source,
      orderingKey: envelope.orderingKey,
    });
    if (!claimed) return;

    try {
      const { violationCaseId, contractId, providerId, customerId, fineAmount, reason } = envelope.payload || {};
      const amount = Number(fineAmount) > 0 ? Number(fineAmount) : 200000;

      await this.prisma.$transaction(async (tx) => {
        const caseRef = (violationCaseId || '').slice(0, 8).toUpperCase();
        // Kiểm tra xem đã có hóa đơn phạt cho vi phạm này chưa (idempotent nghiệp vụ)
        const existingFine = await tx.invoice.findFirst({
          where: { invoiceNumber: { contains: `FINE-${caseRef}` } },
        });
        if (existingFine) return;

        const invoiceNumber = `INV-FINE-${caseRef}-${Math.floor(1000 + Math.random() * 9000)}`;
        const now = new Date();

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            providerId,
            customerId,
            contractId: contractId || null,
            total: amount,
            status: 'UNPAID',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            items: {
              create: [
                {
                  quantity: 1,
                  unit: 'Lần phạt',
                  unitPrice: amount,
                  amount: amount,
                  createdAt: now,
                },
              ],
            },
          },
        });

        await this.outboxService.publishLocal(tx, {
          aggregateType: 'Invoice',
          aggregateId: invoice.id,
          aggregateRevision: 1,
          eventType: BillingEventPatterns.FINE_INVOICE_CREATED,
          payload: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            contractId: invoice.contractId,
            customerId: invoice.customerId,
            providerId: invoice.providerId,
            total: amount,
            violationCaseId,
            reason,
          },
        });
      });

      await this.inboxService.markProcessed(this.prisma, consumerName, envelope.id);
    } catch (error) {
      await this.inboxService.markFailed(this.prisma, consumerName, envelope.id);
      throw error;
    }
  }
}
