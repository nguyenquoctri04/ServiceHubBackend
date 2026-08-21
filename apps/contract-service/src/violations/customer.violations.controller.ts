import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ProviderContractPatterns } from "@app/common/constants/provider.patterns";
import { CustomerViolationsService } from "./customer.violations.service";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";

@Controller()
export class CustomerViolationsController {
    constructor(private readonly service: CustomerViolationsService) {}

    @MessagePattern({ cmd: CustomerPatterns.GET_VIOLATION_RULES })
    async getViolationRules() {
        return this.service.getViolationRules();
    }
}
