import { CUSTOMER_IDENTITIES } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerIdentitiesService } from "./identities.service";

@Controller(CUSTOMER_IDENTITIES)
export class CustomerIdentitiesController {
    constructor(private readonly service: CustomerIdentitiesService) {}
}
