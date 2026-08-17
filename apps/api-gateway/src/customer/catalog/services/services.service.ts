import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { MarketplaceServicesQueryDto } from "@app/common/dto/customer/catalog";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerServicesService {
    constructor(
        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    async getServices(query: MarketplaceServicesQueryDto,) {
        return this.secureRpc.send(
            this.catalogClient,
            {
                cmd: CustomerPatterns.GET_SERVICES,
            },
            query,
        );
    }

    async getCategories() {
        return this.secureRpc.send(
            this.catalogClient,
            {
                cmd: CustomerPatterns.GET_CATEGORIES,
            },
            {},
        );
    }
}
