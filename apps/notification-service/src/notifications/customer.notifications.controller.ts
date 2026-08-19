import { Controller } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { NotifyServiceRegistrationInput } from "@app/common/dto/customer/contract";
import { CustomerNotificationsService } from "./customer.notifications.service";

@Controller()
export class CustomerNotificationsController {
    constructor(private readonly service: CustomerNotificationsService) {}

    @MessagePattern({ cmd: CustomerPatterns.NOTIFY_SERVICE_REGISTRATION })
    async notifyServiceRegistration(
        @Payload() payload: NotifyServiceRegistrationInput,
    ) {
        return this.service.notifyServiceRegistration({
            ...payload,
            occurredAt: new Date(payload.occurredAt),
        });
    }
}
