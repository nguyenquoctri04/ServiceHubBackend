import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CUSTOMER_INVOICES } from '@app/common/constants/customer.endpoint';
import { JwtAuthGuard, CurrentUser } from '@app/common';
import { CustomerInvoicesService } from './invoices.service';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto } from '@app/common/dto/billing/pay-invoice.dto';

type CurrentUserPayload = { id: string; email: string; role: string };

@Controller(CUSTOMER_INVOICES)
@UseGuards(JwtAuthGuard)
export class CustomerInvoicesController {
    constructor(private readonly service: CustomerInvoicesService) {}

    /**
     * GET /api/customer/billing/invoices
     * Lấy danh sách hóa đơn của customer (phân trang, filter status).
     */
    @Get()
    findInvoices(
        @CurrentUser() user: CurrentUserPayload,
        @Query() query: InvoiceQueryDto,
    ) {
        return this.service.findInvoices(user.id, query);
    }

    /**
     * GET /api/customer/billing/invoices/:id
     * Chi tiết một hóa đơn.
     */
    @Get(':id')
    findOneInvoice(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') invoiceId: string,
    ) {
        return this.service.findOneInvoice(user.id, invoiceId);
    }

    /**
     * POST /api/customer/billing/invoices/:id/pay
     * Thanh toán hóa đơn.
     *
     * Body: { paymentMethod: 'CASH' | 'VNPAY' | 'ZALOPAY', note?: string }
     *
     * Response:
     *   CASH    → { paymentMethod, status: 'SUCCESS', paymentId }
     *   VNPAY   → { paymentId, paymentUrl, paymentMethod: 'VNPAY' }
     *   ZALOPAY → { paymentId, paymentUrl, paymentMethod: 'ZALOPAY' }
     */
    @Post(':id/pay')
    payInvoice(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') invoiceId: string,
        @Body() dto: PayInvoiceDto,
        @Req() req: Request,
    ) {
        const ipAddr =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            '127.0.0.1';

        return this.service.payInvoice(user.id, invoiceId, dto, ipAddr);
    }
}
