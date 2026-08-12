import { Controller, Get } from "@nestjs/common";
import { CustomerCategoriesService } from "./categories.service";
import { CUSTOMER_CATALOG_ENDPOINT, CUSTOMER_CATEGORIES } from "@app/common/constants/customer.endpoint";

@Controller(CUSTOMER_CATEGORIES)
export class CustomerCategoriesController {
    constructor(
        private readonly service: CustomerCategoriesService
    ) {}

    @Get(CUSTOMER_CATALOG_ENDPOINT.FETCH_HOME)
    async fetchHome() {
        return this.service.fetchHome();
    }
}