import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { SignContractFileDto } from "@app/common/dto/customer/signature";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerSignaturesService {
    constructor(
        @Inject("SIGNATURE_SERVICE")
        private readonly signatureClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async signContract(identityId: string, dto: SignContractFileDto) {
        return this.secureRpc.send(
            this.signatureClient,
            { cmd: CustomerPatterns.SIGN_CONTRACT_FILE },
            {
                identityId,
                contractFileId: dto.contractFileId,
                passphrase: dto.passphrase,
            },
        );
    }

    async verifyContractSignatures(contractFileId: string) {
        return this.secureRpc.send(
            this.signatureClient,
            { cmd: CustomerPatterns.VERIFY_CONTRACT },
            { contractFileId },
        );
    }
}
