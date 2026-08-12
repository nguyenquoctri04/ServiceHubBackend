import { CUSTOMER_KEYS } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerKeysService } from "./keys.service";

@Controller(CUSTOMER_KEYS)
export class CustomerKeysController {
    constructor(private readonly service: CustomerKeysService) {}
}
