import { CUSTOMER_CATALOG_ENDPOINT, CUSTOMER_SERVICES } from "@app/common/constants/customer.endpoint";
import { Controller, Get, Query } from "@nestjs/common";
import { CustomerServicesService } from "./services.service";
import { MarketplaceServicesQueryDto } from "@app/common/dto/customer/catalog";

@Controller(CUSTOMER_SERVICES)
export class CustomerServicesController {
    constructor(private readonly service: CustomerServicesService) {}

    @Get()
    getServices(
        @Query() query: MarketplaceServicesQueryDto,
    ) {
        return this.service.getServices(query);
    }

    @Get("categories")
    getCategories() {
        return this.service.getCategories();
    }
}
