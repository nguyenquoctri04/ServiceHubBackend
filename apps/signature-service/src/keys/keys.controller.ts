import { Controller } from "@nestjs/common";
import { KeysService } from "./keys.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { CurrentUserPayload } from "apps/api-gateway/src/provider/provider.controller";

@Controller()
export class KeysController {
    constructor(private readonly service: KeysService) {}

    @MessagePattern({ cmd: CustomerPatterns.GET_DIGITAL_SIGNATURE_IN_SETTING })
    async getDigitalSignatureInSetting(
        @Payload()
        payload: {
            identityId: string;
        },
    ) {
        return this.service.getDigitalSignatureInSetting(payload.identityId);
    }

    @MessagePattern({ cmd: CustomerPatterns.CREATE_SIGNATURE })
    async createKey(
        @Payload()
        payload: {
            identityId: string;
            name: string;
            email: string;
            passphrase?: string;
            expiresIn?: string;
        },
    ) {
        return this.service.createKey({
            identityId: payload.identityId,
            name: payload.name,
            email: payload.email,
            passphrase: payload.passphrase,
            expiresIn: payload.expiresIn,
        });
    }
}
