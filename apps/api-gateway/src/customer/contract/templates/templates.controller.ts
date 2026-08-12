import { CUSTOMER_TEMPLATES } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerTemplatesService } from "./templates.service";

@Controller(CUSTOMER_TEMPLATES)
export class CustomerTemplatesController {
    constructor(private readonly service: CustomerTemplatesService) {}
}
