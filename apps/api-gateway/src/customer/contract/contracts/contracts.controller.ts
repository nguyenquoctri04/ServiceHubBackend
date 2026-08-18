import { CUSTOMER_CONTRACTS } from "@app/common/constants/customer.endpoint";
import { Body, Controller, Post } from "@nestjs/common";
import { CurrentUser } from '@app/common';
import { CustomerContractsService } from "./contracts.service";
import { CreateServiceRequestDto } from './dto/create-service-request.dto';

@Controller(CUSTOMER_CONTRACTS)
export class CustomerContractsController {
    constructor(private readonly service: CustomerContractsService) {}

    @Post('requests')
    async createServiceRequest(
        @CurrentUser() user: { id: string },
        @Body() dto: CreateServiceRequestDto,
    ) {
        return this.service.createServiceRequest(user.id, dto);
    }
}
