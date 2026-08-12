import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

import { CustomerPatterns } from "@app/common/constants/customer.patterns";

@Injectable()
export class CustomerCategoriesService {
    constructor(
        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,
    ) {}

    async fetchHome() {
        return firstValueFrom(
            this.catalogClient.send(
                {
                    cmd: CustomerPatterns.GET_HOME_CATEGORIES,
                },
                {},
            ),
        );
    }
}
