import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto, PaymentMethodDto } from '@app/common/dto/billing/pay-invoice.dto';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import { Prisma } from '@prisma/client-billing';
import { SecureRpcService } from '@app/common/security/secure-rpc.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ─── Provider: danh sách hóa đơn ─────────────────────────────────────────
  async findInvoices(providerId: string, query: InvoiceQueryDto) {
    let contractsRes;
    try {
      contractsRes = await Promise.race([
        this.secureRpc.send(
          this.contractClient,
          { cmd: ProviderContractPatterns.FIND },
          { providerId, limit: 1000 },
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000),
        ),
      ]);
    } catch {
      throw new RpcException('Contract Service timeout or failed');
    }

    const contractIds = contractsRes?.data?.map((c: any) => c.id) || [];
    if (contractIds.length === 0) {
      return { data: [], total: 0, page: query.page || 1, limit: query.limit || 10 };
    }

    const where: Prisma.InvoiceWhereInput = { contractId: { in: contractIds } };
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

  // ─── Provider: thanh toán hóa đơn ────────────────────────────────────────
  async payInvoice(
    providerId: string,
    invoiceId: string,
    dto: PayInvoiceDto,
    idempotencyKey: string,
    ipAddr?: string,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw new RpcException(new NotFoundException('Invoice not found'));

    let contractRes;
    try {
      contractRes = await Promise.race([
        this.secureRpc.send(
          this.contractClient,
          { cmd: ProviderContractPatterns.FIND_ONE },
          { providerId, contractId: invoice.contractId },
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000),
        ),
      ]);
    } catch {
      throw new RpcException('Contract Service timeout or failed');
    }
    if (!contractRes)
      throw new RpcException(new NotFoundException('Invoice contract not found or unauthorized'));

    if (invoice.status === 'PAID')
      throw new RpcException(new ConflictException('Invoice is already paid'));

    return this.processPayment(invoice, dto, ipAddr);
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

  // ─── Shared: xử lý thanh toán ────────────────────────────────────────────
  private async processPayment(
    invoice: any,
    dto: PayInvoiceDto,
    ipAddr?: string,
  ) {
    if (dto.paymentMethod === PaymentMethodDto.CASH) {
      const pending = invoice.payments.find((p: any) => p.status === 'PENDING');
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
      return this.paymentsService.createPaymentLink({
        invoiceId:     invoice.id,
        paymentMethod: dto.paymentMethod as 'VNPAY' | 'ZALOPAY',
        ipAddr:        ipAddr ?? '127.0.0.1',
      });
    }

    throw new RpcException('Unsupported payment method');
  }
}
