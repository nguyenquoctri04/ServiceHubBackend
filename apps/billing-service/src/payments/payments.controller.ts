import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentsService } from './payments.service';
import { CustomerBillingPatterns } from '@app/common/constants/customer.billing.patterns';
import { VnpayCallbackParams } from './vnpay.service';
import { ZalopayCallbackBody } from './zalopay.service';

@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  /**
   * Tạo payment link VNPAY hoặc ZALOPAY.
   * Được gọi từ API Gateway khi customer chọn phương thức thanh toán gateway.
   */
  @MessagePattern({ cmd: CustomerBillingPatterns.PAYMENTS_CREATE_LINK })
  createPaymentLink(
    @Payload()
    payload: {
      invoiceId:     string;
      paymentMethod: 'VNPAY' | 'ZALOPAY';
      ipAddr?:       string;
    },
  ) {
    return this.service.createPaymentLink(payload);
  }

  /**
   * Xử lý callback/redirect từ VNPay.
   * API Gateway forward toàn bộ query params về đây.
   */
  @MessagePattern({ cmd: CustomerBillingPatterns.PAYMENTS_VNPAY_CALLBACK })
  handleVnpayCallback(@Payload() params: VnpayCallbackParams) {
    return this.service.handleVnpayCallback(params);
  }

  /**
   * Xử lý IPN callback từ ZaloPay server.
   * API Gateway forward body { data, mac, type } về đây.
   */
  @MessagePattern({ cmd: CustomerBillingPatterns.PAYMENTS_ZALOPAY_CALLBACK })
  handleZalopayCallback(@Payload() body: ZalopayCallbackBody) {
    return this.service.handleZalopayCallback(body);
  }

  /**
   * Kiểm tra trạng thái payment.
   * FE polling sau redirect về trang kết quả.
   */
  @MessagePattern({ cmd: CustomerBillingPatterns.PAYMENTS_CHECK_STATUS })
  checkPaymentStatus(@Payload() payload: { paymentId: string }) {
    return this.service.checkPaymentStatus(payload.paymentId);
  }
}
