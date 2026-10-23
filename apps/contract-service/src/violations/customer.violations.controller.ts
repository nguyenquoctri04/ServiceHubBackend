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

    @MessagePattern({ cmd: CustomerPatterns.CREATE_VIOLATION_REPORT })
    async createViolationReport(
        @Payload()
        payload: {
            customerId: string;
            contractId: string;
            serviceId: string;
            violationRuleId: string;
            description: string;
            occurredAt: string;
            evidenceUrls?: string[];
        },
    ) {
        return this.service.createViolationReport(payload);
    }
}
