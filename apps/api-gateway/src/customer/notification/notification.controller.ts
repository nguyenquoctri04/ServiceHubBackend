import { CUSTOMER_NOTIFICATION_SERVICE_PREFIX } from "@app/common/constants/customer.endpoint";
import { Controller } from "@nestjs/common";
import { CustomerNotificationService } from "./notification.service";

@Controller(CUSTOMER_NOTIFICATION_SERVICE_PREFIX)
export class CustomerNotificationController {
    constructor(private readonly service: CustomerNotificationService) {}
}
