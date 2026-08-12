import { CUSTOMER_EKYC } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerEkycService } from "./ekyc.service";

@Controller(CUSTOMER_EKYC)
export class CustomerEkycController {
    constructor(private readonly service: CustomerEkycService) {}
}
