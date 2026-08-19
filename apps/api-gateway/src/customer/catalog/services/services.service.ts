import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import {
    GetRelatedServicesDto,
    MarketplaceServicesQueryDto,
    ServiceDetailData,
} from "@app/common/dto/customer/catalog";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { CurrentUserPayload } from "apps/api-gateway/src/provider/provider.controller";

@Injectable()
export class CustomerServicesService {
    constructor(
        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    async getServices(
        query: MarketplaceServicesQueryDto,
        user: CurrentUserPayload | null,
    ) {
        return this.secureRpc.send(
            this.catalogClient,
            {
                cmd: CustomerPatterns.GET_SERVICES,
            },
            { query: query, customerId: user?.id ?? null },
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

    async getDetail(
        serviceId: string,
        customerId: string | null,
    ): Promise<ServiceDetailData | null> {
        return this.secureRpc.send(
            this.catalogClient,
            { cmd: CustomerPatterns.GET_SERVICE_DETAIL },
            { serviceId: serviceId, customerId: customerId },
        );
    }

    async getRelated(
        serviceId: string,
        dto: GetRelatedServicesDto,
        user: CurrentUserPayload | null,
    ): Promise<ServiceDetailData[]> {
        return this.secureRpc.send(
            this.catalogClient,
            { cmd: CustomerPatterns.GET_RELATED_SERVICES },
            { serviceId, ...dto, customerId: user?.id ?? null },
        );
    }
}
