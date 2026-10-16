import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { HmacService } from '../security/hmac.service';
import { ReplayProtectionService } from '../security/replay-protection.service';
import { SecureRpcRequest } from '../security/hmac.type';

interface ServiceCredentialEnv {
    nameEnv: string;
    secretEnv: string;
}

// Danh sách cặp biến ENV (không phải giá trị) — khớp với các cặp
// serviceName/secretEnv mà từng service truyền vào CommonModule.forRoot().
const SERVICE_CREDENTIAL_ENVS: ServiceCredentialEnv[] = [
    { nameEnv: 'API_GATEWAY_NAME', secretEnv: 'API_GATEWAY_SECRET' },
    { nameEnv: 'IDENTITY_SERVICE_NAME', secretEnv: 'IDENTITY_SERVICE_SECRET' },
    { nameEnv: 'CATALOG_SERVICE_NAME', secretEnv: 'CATALOG_SERVICE_SECRET' },
    { nameEnv: 'CONTRACT_SERVICE_NAME', secretEnv: 'CONTRACT_SERVICE_SECRET' },
    { nameEnv: 'SIGNATURE_SERVICE_NAME', secretEnv: 'SIGNATURE_SERVICE_SECRET' },
    { nameEnv: 'BILLING_SERVICE_NAME', secretEnv: 'BILLING_SERVICE_SECRET' },
    { nameEnv: 'NOTIFICATION_SERVICE_NAME', secretEnv: 'NOTIFICATION_SERVICE_SECRET' },
    { nameEnv: 'AUDIT_SERVICE_NAME', secretEnv: 'AUDIT_SERVICE_SECRET' },
];

@Injectable()
export class HmacGuard implements CanActivate {
    private readonly logger = new Logger(HmacGuard.name);

    constructor(
        private readonly hmacService: HmacService,
        private readonly replayProtection: ReplayProtectionService,
        private readonly config: ConfigService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (context.getType() !== 'rpc') {
            return true;
        }

        try {
            const request = context.switchToRpc().getData() as SecureRpcRequest;

            if (!request?.meta || request?.data === undefined) {
                this.logger.warn('HmacGuard: Invalid RPC envelope — missing meta or data');
                throw new RpcException({ message: 'Invalid RPC request', statusCode: 400 });
            }

            const { service, requestId, pattern } = request.meta;
            this.logger.debug(
                `HmacGuard: verifying [${pattern}] from service="${service}" requestId=${requestId}`,
            );

            const secret = this.getSecret(service);

            if (!secret) {
                this.logger.warn(`HmacGuard: Unknown service="${service}"`);
                throw new RpcException({ message: 'Unknown service', statusCode: 401 });
            }

            const valid = this.hmacService.verifyRequest(request, secret);

            if (!valid) {
                this.logger.warn(`HmacGuard: Invalid HMAC signature for service="${service}"`);
                throw new RpcException({ message: 'Invalid HMAC signature', statusCode: 401 });
            }

            // Kiểm tra replay — có timeout tự động, fail-open nếu Redis cache không phản hồi
            await this.replayProtection.check(requestId);

            // Guard chạy trước khi @Payload() được resolve, nên có thể ghi đè
            // arg[0] để handler nhận thẳng request.data thay vì cả envelope
            // { meta, data } — giữ nguyên shape DTO cho các controller cũ.
            const args = context.getArgs();
            args[0] = request.data;

            this.logger.debug(`HmacGuard: ✅ passed [${pattern}] from service="${service}"`);
            return true;
        } catch (err: any) {
            // Nếu đã là RpcException, re-throw thẳng để tránh double-wrap
            if (err instanceof RpcException) {
                throw err;
            }
            // Bọc lỗi bất ngờ vào RpcException để đảm bảo luôn có response về Gateway
            this.logger.error('HmacGuard: unexpected error', err?.stack ?? err);
            throw new RpcException({ message: err?.message ?? 'Guard error', statusCode: 500 });
        }
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
