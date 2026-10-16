import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { CustomerInvoicesQueryDto } from "@app/common/dto/customer/billing";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { CurrentUserPayload } from "apps/api-gateway/src/provider/provider.controller";

@Injectable()
export class CustomerInvoicesService {
    constructor(
        @Inject("BILLING_SERVICE")
        private readonly billingClient: ClientProxy,

        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async fetchInvoices(query: CustomerInvoicesQueryDto, user: CurrentUserPayload) {
        const invoices = await this.secureRpc.send<any[]>(
            this.billingClient,
            {
                cmd: CustomerPatterns.FETCH_INVOICES,
            },
            { query: query, customerId: user?.id ?? null },
        );

        if (!Array.isArray(invoices) || invoices.length === 0) {
            return invoices;
        }

        const servicePriceIds = [
            ...new Set(
                invoices.flatMap((invoice) =>
                    invoice.items
                        .map((item: any) => item.servicePriceId)
                        .filter(
                            (id: unknown): id is string =>
                                typeof id === "string",
                        ),
                ),
            ),
        ];

        const priceDetails = servicePriceIds.length
            ? await this.secureRpc.send<any[]>(
                  this.catalogClient,
                  { cmd: CustomerPatterns.GET_SERVICE_PRICE_DETAILS },
                  { servicePriceIds },
              )
            : [];

        const serviceNames = new Map(
            priceDetails.map((detail) => [
                detail.servicePriceId,
                detail.service?.name ?? "",
            ]),
        );

        return invoices.map((invoice) => ({
            ...invoice,
            items: invoice.items.map((item: any) => ({
                ...item,
                serviceName: item.servicePriceId
                    ? (serviceNames.get(item.servicePriceId) ?? "")
                    : "",
            })),
        }));
    }
}