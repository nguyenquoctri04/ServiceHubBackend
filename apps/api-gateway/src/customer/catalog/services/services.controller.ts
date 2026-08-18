import {
    CUSTOMER_CATALOG_ENDPOINT,
    CUSTOMER_IDENTITY_ENDPOINT,
    CUSTOMER_SERVICES,
} from "@app/common/constants/customer.endpoint";
import {
    Controller,
    Get,
    NotFoundException,
    Param,
    Query,
    UseGuards,
} from "@nestjs/common";
import { CustomerServicesService } from "./services.service";
import {
    GetRelatedServicesDto,
    MarketplaceServicesQueryDto,
} from "@app/common/dto/customer/catalog";
import { CurrentUser, JwtAuthGuard, OptionalJwtAuthGuard } from "@app/common";
import { CurrentUserPayload } from "apps/api-gateway/src/provider/provider.controller";

@Controller(CUSTOMER_SERVICES)
export class CustomerServicesController {
    constructor(private readonly service: CustomerServicesService) {}

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    getServices(
        @Query() query: MarketplaceServicesQueryDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.service.getServices(query, user);
    }

    @Get("categories")
    getCategories() {
        return this.service.getCategories();
    }

    @Get(`${CUSTOMER_CATALOG_ENDPOINT.FETCH_SERVICE_DETAIL}/:id`)
    @UseGuards(OptionalJwtAuthGuard)
    async getDetail(
        @Param("id") id: string,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        const result = await this.service.getDetail(id, user?.id);
        if (!result) {
            throw new NotFoundException("Không tìm thấy dịch vụ.");
        }
        return result;
    }

    @Get(`${CUSTOMER_CATALOG_ENDPOINT.FETCH_SERVICE_DETAIL}/:id/relate`)
    @UseGuards(OptionalJwtAuthGuard)
    async getRelated(
        @Param("id") id: string,
        @Query() query: GetRelatedServicesDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.service.getRelated(id, query, user);
    }
}
