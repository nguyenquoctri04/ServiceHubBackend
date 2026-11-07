import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import {
    CreateSignatureKeyDto,
    CreateSignatureKeyResponse,
} from "@app/common/dto/customer/signature";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { AuditEmitterService } from "../../../shared/audit-emitter.service";

@Injectable()
export class CustomerKeysService {
    constructor(
        @Inject("SIGNATURE_SERVICE")
        private readonly signatureClient: ClientProxy,

        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
        private readonly auditEmitter: AuditEmitterService,
    ) {}

    async createKey(
        identityId: string,
        dto: CreateSignatureKeyDto,
    ): Promise<CreateSignatureKeyResponse> {
        // Lấy thông tin identity
        const identity = await this.secureRpc.send(
            this.identityClient,
            {
                cmd: CustomerPatterns.GET_SIGNATURE_INFOR,
            },
            {
                identityId,
            },
        );

        // Tạo signature key
        const result = await this.secureRpc.send(
            this.signatureClient,
            {
                cmd: CustomerPatterns.CREATE_SIGNATURE,
            },
            {
                identityId,
                name: identity.name,
                email: identity.email,
                passphrase: dto.passphrase,
                expiresIn: dto.expiresIn,
            },
        );

        this.auditEmitter.emit({
            userId: identityId,
            serviceName: 'signature-service',
            action: 'CREATE',
            entityType: 'SignatureKey',
            entityId: (result as any)?.id,
            description: `Khởi tạo cặp khóa chữ ký số điện tử cho ${identity.name || identity.email || identityId}`,
        });

        return result;
    }
}
