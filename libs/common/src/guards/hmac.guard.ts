import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RpcException } from "@nestjs/microservices";
import { HmacService } from "../security/hmac.service";
import { ReplayProtectionService } from "../security/replay-protection.service";
import { SecureRpcRequest } from "../security/hmac.type";

interface ServiceCredentialEnv {
    nameEnv: string;
    secretEnv: string;
}

// Danh sách cặp biến ENV (không phải giá trị) — khớp với các cặp
// serviceName/secretEnv mà từng service truyền vào CommonModule.forRoot().
const SERVICE_CREDENTIAL_ENVS: ServiceCredentialEnv[] = [
    { nameEnv: "API_GATEWAY_NAME", secretEnv: "API_GATEWAY_SECRET" },
    { nameEnv: "IDENTITY_SERVICE_NAME", secretEnv: "IDENTITY_SERVICE_SECRET" },
    { nameEnv: "CATALOG_SERVICE_NAME", secretEnv: "CATALOG_SERVICE_SECRET" },
    { nameEnv: "CONTRACT_SERVICE_NAME", secretEnv: "CONTRACT_SERVICE_SECRET" },
    {
        nameEnv: "SIGNATURE_SERVICE_NAME",
        secretEnv: "SIGNATURE_SERVICE_SECRET",
    },
    { nameEnv: "BILLING_SERVICE_NAME", secretEnv: "BILLING_SERVICE_SECRET" },
    {
        nameEnv: "NOTIFICATION_SERVICE_NAME",
        secretEnv: "NOTIFICATION_SERVICE_SECRET",
    },
    { nameEnv: "AUDIT_SERVICE_NAME", secretEnv: "AUDIT_SERVICE_SECRET" },
];

@Injectable()
export class HmacGuard implements CanActivate {
    constructor(
        private readonly hmacService: HmacService,
        private readonly replayProtection: ReplayProtectionService,
        private readonly config: ConfigService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToRpc().getData() as SecureRpcRequest;

        if (!request?.meta || request?.data === undefined) {
            throw new RpcException("Invalid RPC request");
        }

        const { service, requestId } = request.meta;

        const secret = this.getSecret(service);

        if (!secret) {
            throw new RpcException("Unknown service");
        }

        const valid = this.hmacService.verifyRequest(request, secret);

        if (!valid) {
            throw new RpcException("Invalid HMAC signature");
        }

        await this.replayProtection.check(requestId);

        // Guard chạy trước khi @Payload() được resolve, nên có thể ghi đè
        // arg[0] để handler nhận thẳng request.data thay vì cả envelope
        // { meta, data } — giữ nguyên shape DTO cho các controller cũ.
        const args = context.getArgs();
        args[0] = request.data;

        return true;
    }

    private getSecret(serviceName: string): string | undefined {
        const credential = SERVICE_CREDENTIAL_ENVS.find(
            (item) => this.config.get<string>(item.nameEnv) === serviceName,
        );

        if (!credential) {
            return undefined;
        }

        return this.config.get<string>(credential.secretEnv);
    }
}
