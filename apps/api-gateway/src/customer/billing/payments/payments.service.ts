import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerPaymentsService {
    constructor(
        @Inject("BILLING_SERVICE")
        private readonly billingClient: ClientProxy,
    ) {}
}
