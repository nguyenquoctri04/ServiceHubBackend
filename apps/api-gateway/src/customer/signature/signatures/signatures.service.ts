import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { SignContractFileDto } from "@app/common/dto/customer/signature";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { AuditEmitterService } from "../../../shared/audit-emitter.service";

@Injectable()
export class CustomerSignaturesService {
    constructor(
        @Inject("SIGNATURE_SERVICE")
        private readonly signatureClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
        private readonly auditEmitter: AuditEmitterService,
    ) {}

    async signContract(identityId: string, dto: SignContractFileDto) {
        const result = await this.secureRpc.send(
            this.signatureClient,
            { cmd: CustomerPatterns.SIGN_CONTRACT_FILE },
            {
                identityId,
                contractFileId: dto.contractFileId,
                passphrase: dto.passphrase,
            },
        );
        this.auditEmitter.emit({
            userId: identityId,
            serviceName: 'signature-service',
            action: 'SIGN_CONTRACT',
            entityType: 'ContractFile',
            entityId: dto.contractFileId,
            description: 'Ký số điện tử vào văn bản hợp đồng',
        });
        return result;
    }
}
