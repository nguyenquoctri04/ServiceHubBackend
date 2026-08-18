import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { SecureRpcService } from "@app/common";

@Injectable()
export class CustomerCategoriesService {
    constructor(
        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async fetchHome() {
        return this.secureRpc.send(
            this.catalogClient,
            {
                cmd: CustomerPatterns.GET_HOME_CATEGORIES,
            },
            {},
        );
    }

    fetchCategories() {
        return this.secureRpc.send(
            this.catalogClient,
            { cmd: CustomerPatterns.GET_CATEGORIES },
            {},
        );
    }
}
