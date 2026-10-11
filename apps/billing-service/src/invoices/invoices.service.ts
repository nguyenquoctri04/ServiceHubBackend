import { Injectable, Optional, ConflictException, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto, PaymentMethodDto } from '@app/common/dto/billing/pay-invoice.dto';
import { Prisma } from '@prisma/client-billing';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly paymentsService?: PaymentsService,
  ) {}

  // ─── Provider: danh sách hóa đơn ─────────────────────────────────────────
  async findInvoices(providerId: string, query: InvoiceQueryDto) {
    const where: Prisma.InvoiceWhereInput = {
      providerId,
    };

    if (query.status) {
      where.status = query.status as any;
    }

    if (query.search) {
      where.invoiceNumber = { contains: query.search, mode: 'insensitive' };
    }
    if (query.contractIds?.length) {
      where.contractId = { in: query.contractIds };
    }

    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip  = (page - 1) * limit;

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

    return {
      monthlyRevenue: Number(monthlyInvoices._sum.total ?? 0),
      unpaidRevenue: Number(unpaidInvoices._sum.total ?? 0),
    };
  }

  // ─── Provider: thanh toán hóa đơn (Idempotent & Concurrency Safe) ────────
  async payInvoice(
    providerId: string,
    invoiceId: string,
    dto: PayInvoiceDto,
    idempotencyKey: string,
    ipAddr?: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, providerId },
      include: { payments: true },
    });
    if (!invoice) throw new RpcException(new NotFoundException('Không tìm thấy hóa đơn'));

    if (
      dto.paymentMethod === PaymentMethodDto.VNPAY ||
      dto.paymentMethod === PaymentMethodDto.ZALOPAY
    ) {
      if (!this.paymentsService) {
        throw new RpcException('Payments service chưa được cấu hình');
      }
      return this.paymentsService.createPaymentLink({
        invoiceId,
        paymentMethod: dto.paymentMethod as 'VNPAY' | 'ZALOPAY',
        ipAddr: ipAddr ?? '127.0.0.1',
      });
    }

    const previousPayment = await this.prisma.payment.findUnique({ where: { paymentLinkId: idempotencyKey } });
    if (previousPayment) {
      if (previousPayment.invoiceId === invoiceId) return previousPayment;
      throw new RpcException(new ConflictException('Idempotency-Key đã được dùng cho hóa đơn khác'));
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const currentInvoice = await tx.invoice.findFirst({
          where: { id: invoiceId, providerId },
          include: { payments: { where: { status: 'PENDING' }, select: { id: true } } },
        });
        if (!currentInvoice) throw new RpcException(new NotFoundException('Không tìm thấy hóa đơn'));
        if (currentInvoice.status === 'PAID') throw new RpcException(new ConflictException('Hóa đơn đã được thanh toán'));
        if (currentInvoice.payments.length > 0) throw new RpcException(new ConflictException('Hóa đơn đang có giao dịch chờ xử lý'));

        const now = new Date();
        const updated = await tx.invoice.updateMany({
          where: { id: invoiceId, providerId, status: { in: ['UNPAID', 'OVERDUE'] } },
          data: { status: 'PAID', updatedAt: now },
        });
        if (updated.count !== 1) throw new RpcException(new ConflictException('Hóa đơn không còn ở trạng thái có thể thanh toán'));

        return tx.payment.create({
          data: {
            invoiceId,
            paymentMethod: dto.paymentMethod,
            paymentLinkId: idempotencyKey,
            status: 'SUCCESS',
            paidAt: now,
            createdAt: now,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.prisma.payment.findUnique({ where: { paymentLinkId: idempotencyKey } });
        if (duplicate?.invoiceId === invoiceId) return duplicate;
      }
      throw error;
    }
  }

  // ─── Provider: biểu đồ tăng trưởng 6 tháng ───────────────────────────────
  async getRevenueGrowth(providerId: string) {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { monthIndex: d.getMonth(), year: d.getFullYear(), label: `T${d.getMonth() + 1}` };
    });

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const paidInvoices = await this.prisma.invoice.findMany({
      where: {
        providerId,
        status: 'PAID',
        createdAt: { gte: sixMonthsAgo },
      },
      select: { total: true, createdAt: true },
    });

    return months.map((m) => {
      const total = paidInvoices
        .filter((inv) => inv.createdAt.getMonth() === m.monthIndex && inv.createdAt.getFullYear() === m.year)
        .reduce((sum, inv) => sum + Number(inv.total), 0);
      return { month: m.label, total };
    });
  }

  // ─── Provider: phân bổ tuổi nợ ───────────────────────────────────────────
  async getInvoiceAging(providerId: string) {
    const stats = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: { providerId },
      _count: { id: true },
    });

    let paid = 0, unpaid = 0, overdue = 0;
    stats.forEach((s) => {
      if (s.status === 'PAID') paid = s._count.id;
      if (s.status === 'UNPAID') unpaid = s._count.id;
      if (s.status === 'OVERDUE') overdue = s._count.id;
    });

    const total = paid + unpaid + overdue;
    if (total === 0) return { paid: 0, unpaid: 0, overdue: 0 };

    return {
      paid: Math.round((paid / total) * 100),
      unpaid: Math.round((unpaid / total) * 100),
      overdue: Math.round((overdue / total) * 100),
    };
  }

  // ─── Provider: lịch sử 5 thanh toán gần nhất ──────────────────────────────
  async getRecentPayments(providerId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: { providerId },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        invoice: { select: { invoiceNumber: true } },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      type: 'PAYMENT',
      title: 'Thanh toán thành công',
      description: `HĐ số ${p.invoice?.invoiceNumber || ''}`,
      timestamp: p.createdAt,
      color: 'green',
    }));
  }

  // ─── Customer: danh sách hóa đơn ─────────────────────────────────────────
  async findCustomerInvoices(customerId: string, query: InvoiceQueryDto) {
    const where: Prisma.InvoiceWhereInput = { customerId };
    if (query.status) where.status = query.status as any;
    if (query.search) where.invoiceNumber = { contains: query.search, mode: 'insensitive' };

    const page  = query.page  ? Number(query.page)  : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip  = (page - 1) * limit;

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

  // ─── Customer: chi tiết hóa đơn ──────────────────────────────────────────
  async findOneCustomerInvoice(customerId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, customerId },
      include: { items: true, payments: true },
    });
    if (!invoice) throw new RpcException(new NotFoundException('Invoice not found'));
    return invoice;
  }

  // ─── Customer: thanh toán hóa đơn ────────────────────────────────────────
  async customerPayInvoice(
    customerId: string,
    invoiceId: string,
    dto: PayInvoiceDto,
    ipAddr?: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, customerId },
      include: { payments: true },
    });
    if (!invoice) throw new RpcException(new NotFoundException('Invoice not found'));
    if (invoice.status === 'PAID')
      throw new RpcException(new ConflictException('Invoice is already paid'));

    return this.processPayment(invoice, dto, ipAddr);
  }

  // ─── Shared: xử lý thanh toán (CASH / VNPAY / ZALOPAY) ────────────────────
  private async processPayment(
    invoice: any,
    dto: PayInvoiceDto,
    ipAddr?: string,
  ) {
    if (dto.paymentMethod === PaymentMethodDto.CASH) {
      const pending = invoice.payments?.find((p: any) => p.status === 'PENDING');
      if (pending)
        throw new RpcException(new ConflictException('There is an ongoing pending payment.'));

      const payment = await this.prisma.$transaction(async (tx) => {
        const p = await tx.payment.create({
          data: {
            invoiceId:     invoice.id,
            paymentMethod: 'CASH',
            status:        'SUCCESS',
            paidAt:        new Date(),
            createdAt:     new Date(),
          },
        });
        await tx.invoice.update({
          where: { id: invoice.id },
          data:  { status: 'PAID', updatedAt: new Date() },
        });
        return p;
      });

      return { paymentMethod: 'CASH', status: 'SUCCESS', paymentId: payment.id };
    }

    if (
      dto.paymentMethod === PaymentMethodDto.VNPAY ||
      dto.paymentMethod === PaymentMethodDto.ZALOPAY
    ) {
      if (!this.paymentsService) {
        throw new RpcException('Payments service chưa được cấu hình');
      }
      return this.paymentsService.createPaymentLink({
        invoiceId:     invoice.id,
        paymentMethod: dto.paymentMethod as 'VNPAY' | 'ZALOPAY',
        ipAddr:        ipAddr ?? '127.0.0.1',
      });
    }

    throw new RpcException('Unsupported payment method');
  }
}
