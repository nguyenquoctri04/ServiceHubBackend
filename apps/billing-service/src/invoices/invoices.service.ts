import { Injectable, Inject, RequestTimeoutException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto } from '@app/common/dto/billing/pay-invoice.dto';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import { Prisma } from '@prisma/client-billing';
import { SecureRpcService } from '@app/common/security/secure-rpc.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
  ) { }

  async findInvoices(providerId: string, query: InvoiceQueryDto) {
    // 1. Fetch contracts for provider
    let contractsRes;
    try {
      contractsRes = await Promise.race([
        this.secureRpc.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId, limit: 1000 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
    } catch (err) {
      throw new RpcException('Contract Service timeout or failed');
    }

    const contractIds = contractsRes?.data?.map((c: any) => c.id) || [];
    if (contractIds.length === 0) {
      return { data: [], total: 0, page: query.page || 1, limit: query.limit || 10 };
    }

    const where: Prisma.InvoiceWhereInput = {
      contractId: { in: contractIds },
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
    // Note: Idempotency-Key logic is checked at Gateway via Redis, so we assume this request is unique.

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    });

    if (!invoice) {
      throw new RpcException(new NotFoundException('Invoice not found'));
    }

    // Provider check via contract is skipped here for brevity, but could be added.
    // For now we assume Gateway checked or we trust it. Let's check contract.
    let contractRes;
    try {
      contractRes = await Promise.race([
        this.secureRpc.send(this.contractClient, { cmd: ProviderContractPatterns.FIND_ONE }, { providerId, contractId: invoice.contractId }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
    } catch (err) {
      throw new RpcException('Contract Service timeout or failed');
    }
    if (!contractRes) {
      throw new RpcException(new NotFoundException('Invoice contract not found or unauthorized'));
    }

    if (invoice.status === 'PAID') {
      throw new RpcException(new ConflictException('Invoice is already paid'));
    }

    const pendingPayment = invoice.payments.find(p => p.status === 'PENDING');
    if (pendingPayment) {
      throw new RpcException(new ConflictException('There is an ongoing pending payment. Please wait or cancel it.'));
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentMethod: dto.paymentMethod as any,
          status: 'SUCCESS',
          paidAt: new Date(),
          createdAt: new Date(),
        }
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          updatedAt: new Date(),
        }
      });

      return p;
    });

    return payment;
  }
}
