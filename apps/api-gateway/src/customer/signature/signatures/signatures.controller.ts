import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, CurrentUser } from "@app/common";
import { SignContractFileDto } from "@app/common/dto/customer/signature";
import { CustomerSignaturesService } from "./signatures.service";
import { CUSTOMER_SIGNATURE_ENDPOINT, CUSTOMER_SIGNATURES } from "@app/common/constants/customer.endpoint";

@Controller(CUSTOMER_SIGNATURES)
export class CustomerSignaturesController {
    constructor(private readonly service: CustomerSignaturesService) {}

    @Post("sign")
    @UseGuards(JwtAuthGuard)
    async signContract(
        @CurrentUser("id") identityId: string,
        @Body() dto: SignContractFileDto,
    ) {
        return this.service.signContract(identityId, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get(CUSTOMER_SIGNATURE_ENDPOINT.VERIFY_CONTRACT)
    async verifyContractSignatures(
        @Param("contractFileId") contractFileId: string,
    ) {
        return this.service.verifyContractSignatures(contractFileId);
    }
}
