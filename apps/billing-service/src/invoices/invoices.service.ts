import { Inject, Injectable, Optional, ConflictException, NotFoundException } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto, PaymentMethodDto } from '@app/common/dto/billing/pay-invoice.dto';
import { Prisma } from '@prisma/client-billing';
import { PaymentsService } from '../payments/payments.service';
import { SecureRpcService } from '@app/common';
import { CustomerPatterns } from '@app/common/constants/customer.patterns';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
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
      const result = await this.prisma.$transaction(async (tx) => {
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

        const payment = await tx.payment.create({
          data: {
            invoiceId,
            paymentMethod: dto.paymentMethod,
            paymentLinkId: idempotencyKey,
            status: 'SUCCESS',
            paidAt: now,
            createdAt: now,
          },
        });

        return { payment, contractId: currentInvoice.contractId };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      // Nếu hóa đơn gắn với hợp đồng (trả trước hoặc định kỳ), kích hoạt hợp đồng sang ACTIVE
      if (result.contractId) {
        void this.secureRpc.send(
          this.contractClient,
          { cmd: CustomerPatterns.ACTIVATE_CONTRACT_AFTER_PREPAYMENT },
          { contractId: result.contractId },
        ).catch((err) => {
          console.warn(`[InvoicesService.payInvoice] Failed to activate contract ${result.contractId}:`, err?.message || err);
        });
      }

      return result.payment;
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