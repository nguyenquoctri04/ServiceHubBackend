import { Controller } from "@nestjs/common";
import { CustomerInvoicesService } from "./customer.invoices.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { CustomerInvoicesQueryDto } from "@app/common/dto/customer/billing";

@Controller()
export class CustomerInvoicesController {
    constructor(private readonly service: CustomerInvoicesService) {}

    @MessagePattern({ cmd: CustomerPatterns.FETCH_INVOICES })
    fetchInvoices(
        @Payload()
        payload: {
            query: CustomerInvoicesQueryDto;
            customerId: string | null;
        },
    ) {
        return this.service.fetchInvoices(payload.query, payload.customerId);
    }

    @MessagePattern({
        cmd: CustomerPatterns.CREATE_CONTRACT_PREPAYMENT_INVOICE,
    })
    createPrepaymentInvoice(
        @Payload()
        payload: {
            contractId: string;
            customerId: string;
            providerId: string;
            servicePriceId: string;
            quantity: number;
            unit: string;
            unitPrice: number;
        },
    ) {
        return this.service.createPrepaymentInvoice(payload);
    }

    @MessagePattern({
        cmd: CustomerPatterns.DELETE_CONTRACT_PREPAYMENT_INVOICE,
    })
    deleteContractPrepaymentInvoice(@Payload() payload: { contractId: string }) {
        return this.service.deleteContractPrepaymentInvoice(payload.contractId);
    }

    @MessagePattern({ cmd: CustomerPatterns.CANCEL_CONTRACT_PREPAYMENT_INVOICE })
    cancelContractPrepaymentInvoice(@Payload() payload: { contractId: string }) {
        return this.service.cancelContractPrepaymentInvoice(payload.contractId);
    }

    @MessagePattern({ cmd: CustomerPatterns.CREATE_QR_CODE})
    createQrCode(@Payload() payload: {invoiceId: string, customerId: string}) {
        return this.service.createQrCode(payload)
    }

    @MessagePattern({ cmd: CustomerPatterns.CHECK_PAYMENT_STATUS })
    checkPaymentStatus(
        @Payload() payload: { invoiceId: string; customerId: string },
    ) {
        return this.service.checkPaymentStatus(payload);
    }
}
