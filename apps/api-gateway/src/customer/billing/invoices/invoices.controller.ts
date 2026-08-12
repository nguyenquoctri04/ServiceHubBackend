import { CUSTOMER_INVOICES } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerInvoicesService } from "./invoices.service";

@Controller(CUSTOMER_INVOICES)
export class CustomerInvoicesController {
    constructor(private readonly service: CustomerInvoicesService) {}
}
