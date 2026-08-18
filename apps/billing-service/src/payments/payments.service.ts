import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { VnpayService, VnpayCallbackParams } from './vnpay.service';
import { ZalopayService, ZalopayCallbackBody } from './zalopay.service';

export interface CreatePaymentLinkDto {
  invoiceId: string;
  paymentMethod: 'VNPAY' | 'ZALOPAY';
  /** IP của người dùng — dùng cho VNPay */
  ipAddr?: string;
  /** returnUrl FE muốn được redirect về sau thanh toán (override env) */
  returnUrl?: string;
}

export interface CreatePaymentLinkResult {
  paymentId: string;
  paymentUrl: string;
  paymentMethod: 'VNPAY' | 'ZALOPAY';
}

export interface HandleVnpayCallbackResult {
  success: boolean;
  message: string;
  invoiceId?: string;
}

export interface HandleZalopayCallbackResult {
  /** ZaloPay yêu cầu trả về { return_code, return_message } */
  return_code: number;
  return_message: string;
}

export interface CheckPaymentStatusResult {
  paymentId: string;
  invoiceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  paymentMethod: string;
  paidAt: Date | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpay: VnpayService,
    private readonly zalopay: ZalopayService,
  ) {}

  /**
   * Tạo payment link cho VNPAY hoặc ZALOPAY.
   * Tạo record Payment với status=PENDING, lưu paymentLinkId (appTransId / txnRef).
   * Trả về URL redirect cho FE.
   */
  async createPaymentLink(
    dto: CreatePaymentLinkDto,
  ): Promise<CreatePaymentLinkResult> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new RpcException(new NotFoundException('Invoice not found'));
    }

    if (invoice.status === 'PAID') {
      throw new RpcException(new ConflictException('Invoice is already paid'));
    }

    // Hủy các payment PENDING cũ cùng method (nếu có) để tránh duplicate link
    const pendingPayments = invoice.payments.filter(
      (p) => p.status === 'PENDING' && p.paymentMethod === dto.paymentMethod,
    );
    if (pendingPayments.length > 0) {
      await this.prisma.payment.updateMany({
        where: {
          id: { in: pendingPayments.map((p) => p.id) },
        },
        data: { status: 'FAILED' },
      });
    }

    const amountNumber = Number(invoice.total);

    // Tạo payment record PENDING trước để có ID làm txnRef/appTransId
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId:     dto.invoiceId,
        paymentMethod: dto.paymentMethod,
        status:        'PENDING',
        createdAt:     new Date(),
      },
    });

    try {
      let paymentUrl: string;
      let externalId: string;

      if (dto.paymentMethod === 'VNPAY') {
        const result = this.vnpay.createPaymentUrl(
          payment.id,
          amountNumber,
          `Thanh toan hoa don ${invoice.invoiceNumber}`,
          dto.ipAddr ?? '127.0.0.1',
        );
        paymentUrl = result.paymentUrl;
        externalId = result.txnRef; // = payment.id
      } else {
        // ZALOPAY
        const result = await this.zalopay.createOrder(
          payment.id,
          amountNumber,
          `Thanh toan hoa don ${invoice.invoiceNumber}`,
          { invoiceId: dto.invoiceId },
        );
        paymentUrl = result.paymentUrl;
        externalId = result.appTransId; // yyMMdd_<uuid>
      }

      // Lưu externalId vào paymentLinkId để tra cứu khi callback về
      await this.prisma.payment.update({
        where: { id: payment.id },
        data:  { paymentLinkId: externalId },
      });

      this.logger.log(
        `Payment link created: id=${payment.id} method=${dto.paymentMethod} invoice=${dto.invoiceId}`,
      );

      return {
        paymentId:     payment.id,
        paymentUrl,
        paymentMethod: dto.paymentMethod,
      };
    } catch (err: any) {
      // Nếu tạo link thất bại thì mark payment là FAILED
      await this.prisma.payment.update({
        where: { id: payment.id },
        data:  { status: 'FAILED' },
      });
      throw new RpcException(
        err?.message ?? 'Failed to create payment link',
      );
    }
  }

  /**
   * Xử lý callback từ VNPay (GET redirect params).
   * Verify chữ ký → cập nhật Payment + Invoice.
   */
  async handleVnpayCallback(
    params: VnpayCallbackParams,
  ): Promise<HandleVnpayCallbackResult> {
    const result = this.vnpay.verifyCallback(params);

    if (!result.isValid) {
      this.logger.warn(`VNPay callback invalid signature: txnRef=${result.txnRef}`);
      return { success: false, message: 'Invalid signature' };
    }

    // txnRef = payment.id (UUID)
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { id: result.txnRef },
          { paymentLinkId: result.txnRef },
        ],
        paymentMethod: 'VNPAY',
      },
      include: { invoice: true },
    });

    if (!payment) {
      this.logger.warn(`VNPay callback: payment not found for txnRef=${result.txnRef}`);
      return { success: false, message: 'Payment not found' };
    }

    if (payment.status !== 'PENDING') {
      // Đã xử lý rồi (idempotent)
      return {
        success:   payment.status === 'SUCCESS',
        message:   'Already processed',
        invoiceId: payment.invoiceId,
      };
    }

    if (result.isSuccess) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data:  {
            status:        'SUCCESS',
            paidAt:        new Date(),
            paymentLinkId: result.transactionNo || payment.paymentLinkId,
          },
        }),
        this.prisma.invoice.update({
          where: { id: payment.invoiceId },
          data:  { status: 'PAID', updatedAt: new Date() },
        }),
      ]);

      this.logger.log(
        `VNPay payment SUCCESS: paymentId=${payment.id} invoiceId=${payment.invoiceId}`,
      );
      return { success: true, message: 'Payment successful', invoiceId: payment.invoiceId };
    } else {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data:  { status: 'FAILED' },
      });

      this.logger.warn(
        `VNPay payment FAILED: paymentId=${payment.id} responseCode=${result.responseCode}`,
      );
      return { success: false, message: `Payment failed: ${result.responseCode}`, invoiceId: payment.invoiceId };
    }
  }

  /**
   * Xử lý callback IPN từ ZaloPay (POST JSON { data, mac, type }).
   * ZaloPay yêu cầu response { return_code: 1, return_message: 'success' } khi nhận thành công.
   */
  async handleZalopayCallback(
    body: ZalopayCallbackBody,
  ): Promise<HandleZalopayCallbackResult> {
    const result = this.zalopay.verifyCallback(body);

    if (!result.isValid) {
      this.logger.warn('ZaloPay callback: invalid MAC');
      return { return_code: -1, return_message: 'Invalid MAC' };
    }

    // appTransId = yyMMdd_<paymentId-no-dashes-20chars>
    const payment = await this.prisma.payment.findFirst({
      where: {
        paymentLinkId: result.appTransId,
        paymentMethod: 'ZALOPAY',
      },
    });

    if (!payment) {
      this.logger.warn(`ZaloPay callback: payment not found for appTransId=${result.appTransId}`);
      // Trả về 1 để ZaloPay không retry (tránh spam)
      return { return_code: 1, return_message: 'Payment not found but acknowledged' };
    }

    if (payment.status !== 'PENDING') {
      return { return_code: 1, return_message: 'Already processed' };
    }

    if (result.isSuccess) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data:  {
            status: 'SUCCESS',
            paidAt: new Date(),
            // Lưu zpTransId vào paymentLinkId (ghi đè appTransId)
            ...(result.zpTransId ? { paymentLinkId: result.zpTransId } : {}),
          },
        }),
        this.prisma.invoice.update({
          where: { id: payment.invoiceId },
          data:  { status: 'PAID', updatedAt: new Date() },
        }),
      ]);

      this.logger.log(
        `ZaloPay payment SUCCESS: paymentId=${payment.id} invoiceId=${payment.invoiceId}`,
      );
    } else {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data:  { status: 'FAILED' },
      });
      this.logger.warn(`ZaloPay payment FAILED: paymentId=${payment.id}`);
    }

    // Luôn trả 1 để ZaloPay không retry
    return { return_code: 1, return_message: 'success' };
  }

  /**
   * Kiểm tra trạng thái payment theo paymentId.
   * FE polling sau khi redirect về trang kết quả.
   */
  async checkPaymentStatus(paymentId: string): Promise<CheckPaymentStatusResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new RpcException(new NotFoundException(`Payment ${paymentId} not found`));
    }

    return {
      paymentId:     payment.id,
      invoiceId:     payment.invoiceId,
      status:        payment.status as 'PENDING' | 'SUCCESS' | 'FAILED',
      paymentMethod: payment.paymentMethod,
      paidAt:        payment.paidAt,
    };
  }
}
