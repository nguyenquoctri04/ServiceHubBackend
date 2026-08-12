import { CUSTOMER_SIGNATURES } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerSignaturesService } from "./signatures.service";

@Controller(CUSTOMER_SIGNATURES)
export class CustomerSignaturesController {
    constructor(private readonly service: CustomerSignaturesService) {}
}
