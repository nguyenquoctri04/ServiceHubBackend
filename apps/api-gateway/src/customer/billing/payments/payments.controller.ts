import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { CUSTOMER_PAYMENTS } from '@app/common/constants/customer.endpoint';
import { JwtAuthGuard, CurrentUser } from '@app/common';
import { CustomerPaymentsService } from './payments.service';

type CurrentUserPayload = { id: string; email: string; role: string };

@Controller(CUSTOMER_PAYMENTS)
export class CustomerPaymentsController {
    constructor(private readonly service: CustomerPaymentsService) {}

    /**
     * GET /api/customer/billing/payments/vnpay/callback
     *
     * VNPay redirect customer về đây sau khi thanh toán (thành công hoặc thất bại).
     * Endpoint PUBLIC — không cần JWT (VNPay gọi không có token).
     *
     * VNPay gửi toàn bộ thông tin qua query string: vnp_TxnRef, vnp_ResponseCode,
     * vnp_SecureHash, v.v.
     * Service forward sang billing-service để verify chữ ký và cập nhật DB.
     */
    @Get('vnpay/callback')
    handleVnpayCallback(@Query() params: Record<string, string>) {
        return this.service.handleVnpayCallback(params);
    }

    /**
     * POST /api/customer/billing/payments/zalopay/callback
     *
     * ZaloPay POST IPN về đây sau khi giao dịch hoàn tất.
     * Endpoint PUBLIC — ZaloPay server gọi, không có JWT.
     *
     * Body: { data: string, mac: string, type: number }
     * Response phải trả về { return_code: 1, return_message: 'success' }
     * để ZaloPay xác nhận đã nhận. Nếu không trả đúng, ZaloPay sẽ retry.
     */
    @Post('zalopay/callback')
    @HttpCode(HttpStatus.OK)
    handleZalopayCallback(
        @Body() body: { data: string; mac: string; type: number },
    ) {
        return this.service.handleZalopayCallback(body);
    }

    /**
     * GET /api/customer/billing/payments/:id/status
     *
     * Kiểm tra trạng thái payment theo paymentId.
     * FE polling sau khi redirect về trang kết quả.
     * Yêu cầu JWT — chỉ customer đã đăng nhập mới được check.
     *
     * Response: { paymentId, invoiceId, status: PENDING|SUCCESS|FAILED, paidAt }
     */
    @Get(':id/status')
    @UseGuards(JwtAuthGuard)
    checkPaymentStatus(
        @CurrentUser() _user: CurrentUserPayload,
        @Param('id') paymentId: string,
    ) {
        return this.service.checkPaymentStatus(paymentId);
    }
}
