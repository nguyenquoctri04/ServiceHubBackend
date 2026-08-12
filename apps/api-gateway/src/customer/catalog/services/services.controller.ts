import { CUSTOMER_SERVICES } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerServicesService } from "./services.service";

@Controller(CUSTOMER_SERVICES)
export class CustomerServicesController {
    constructor(private readonly service: CustomerServicesService) {}
}
