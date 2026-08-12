import { CUSTOMER_VIOLATIONS } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerViolationsService } from "./violations.service";

@Controller(CUSTOMER_VIOLATIONS)
export class CustomerViolationsController {
    constructor(private readonly service: CustomerViolationsService) {}
}
