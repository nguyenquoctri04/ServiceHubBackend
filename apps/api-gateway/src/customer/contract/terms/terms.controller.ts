import { CUSTOMER_TERMS } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerTermsService } from "./terms.service";

@Controller(CUSTOMER_TERMS)
export class CustomerTermsController {
    constructor(private readonly service: CustomerTermsService) {}
}
