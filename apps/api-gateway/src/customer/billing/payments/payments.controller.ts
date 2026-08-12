import { CUSTOMER_PAYMENTS } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerPaymentsService } from "./payments.service";

@Controller(CUSTOMER_PAYMENTS)
export class CustomerPaymentsController {
    constructor(private readonly service: CustomerPaymentsService) {}
}
