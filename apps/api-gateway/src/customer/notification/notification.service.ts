import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerNotificationService {
    constructor(
        @Inject("NOTIFICATION_SERVICE")
        private readonly notificationClient: ClientProxy,
    ) {}
}
