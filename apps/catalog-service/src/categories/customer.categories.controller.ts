import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { CustomerCategoriesService } from "./customer.categories.service";

@Controller()
export class CustomerCategoriesController {
    constructor(
        private readonly service: CustomerCategoriesService
    ) {}

    @MessagePattern({cmd: CustomerPatterns.GET_HOME_CATEGORIES})
    async getHomeCategories() {
        return this.service.getHomeCategories();
    }

    @MessagePattern({
        cmd: CustomerPatterns.GET_CATEGORIES,
    })
    getCategories() {
        return this.service.getCategories();
    }
}