import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerInvoicesService {
    constructor(
        @Inject("BILLING_SERVICE")
        private readonly billingClient: ClientProxy,
    ) {}
}
