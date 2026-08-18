import { CUSTOMER_EKYC, CUSTOMER_EKYC_ENDPOINT } from "@app/common/constants/customer.endpoint";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CustomerEkycService, ApiGatewayExtractOcrDto, ApiGatewayVerifyFaceDto } from "./ekyc.service";
import { CurrentUser, JwtAuthGuard } from "@app/common";

type CurrentUserPayload = {
    id: string;
    email: string;
    role: string;
};

@Controller(CUSTOMER_EKYC)
@UseGuards(JwtAuthGuard)
export class CustomerEkycController {
    constructor(private readonly service: CustomerEkycService) {}

    @Post(CUSTOMER_EKYC_ENDPOINT.OCR)
    async extractOcr(
        @Body() dto: ApiGatewayExtractOcrDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.service.extractOcr(dto, user.id);
    }

    @Post(CUSTOMER_EKYC_ENDPOINT.VERIFY_FACE)
    async verifyFace(
        @Body() dto: ApiGatewayVerifyFaceDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.service.verifyFace(dto, user.id);
    }
}
