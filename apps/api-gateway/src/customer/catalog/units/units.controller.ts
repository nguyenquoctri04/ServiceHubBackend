import { CUSTOMER_UNITS } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerUnitsService } from "./units.service";

@Controller(CUSTOMER_UNITS)
export class CustomerUnitsController {
    constructor(private readonly service: CustomerUnitsService) {}
}
