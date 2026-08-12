import { CUSTOMER_CONTRACTS } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerContractsService } from "./contracts.service";

@Controller(CUSTOMER_CONTRACTS)
export class CustomerContractsController {
    constructor(private readonly service: CustomerContractsService) {}
}
