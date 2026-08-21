import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerViolationsService {
    constructor(
        @Inject("CONTRACT_SERVICE")
        private readonly contractClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async getViolationRules() {
        return this.secureRpc.send(
            this.contractClient,
            { cmd: CustomerPatterns.GET_VIOLATION_RULES },
            {},
        );
    }
}
