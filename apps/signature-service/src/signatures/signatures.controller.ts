import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { SignaturesService } from "./signatures.service";

@Controller()
export class SignaturesController {
    constructor(private readonly service: SignaturesService) {}

    @MessagePattern({ cmd: CustomerPatterns.SIGN_CONTRACT_FILE })
    async signContract(
        @Payload()
        payload: {
            identityId: string;
            contractFileId: string;
            passphrase: string;
        },
    ) {
        return this.service.signContract(payload);
    }

    @MessagePattern({ cmd: CustomerPatterns.VERIFY_CONTRACT })
    async verifyContractSignatures(
        @Payload()
        payload: {
            contractFileId: string;
        },
    ) {
        return this.service.verifyContractSignatures(payload.contractFileId);
    }

    @MessagePattern({
        cmd: CustomerPatterns.GET_SIGNATURES_BY_CONTRACT_FILE_IDS,
    })
    async getSignaturesByContractFileIds(
        @Payload() payload: { contractFileIds: string[] },
    ) {
        return this.service.getSignaturesByContractFileIds(
            payload.contractFileIds,
        );
    }
}
