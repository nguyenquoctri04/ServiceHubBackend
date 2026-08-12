import { CUSTOMER_AUDIT_SERVICE_PREFIX } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerAuditService } from "./audit.service";

@Controller(CUSTOMER_AUDIT_SERVICE_PREFIX)
export class CustomerAuditController {
    constructor(private readonly service: CustomerAuditService) {}
}
