import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto } from '@app/common/dto/billing/pay-invoice.dto';
import { Prisma } from '@prisma/client-billing';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

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

    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payments: true }
      })
    ]);

    return { data, total, page, limit };
  }

  async payInvoice(providerId: string, invoiceId: string, dto: PayInvoiceDto, idempotencyKey: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, providerId },
      select: { id: true },
    });
    if (!invoice) throw new RpcException(new NotFoundException('Không tìm thấy hóa đơn'));

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
}
