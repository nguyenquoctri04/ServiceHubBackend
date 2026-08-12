import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerAuditService {
    constructor(
        @Inject("AUDIT_SERVICE")
        private readonly auditClient: ClientProxy,
    ) {}
}
