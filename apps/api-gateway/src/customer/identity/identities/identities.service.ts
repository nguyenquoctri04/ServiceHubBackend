import { Inject, Injectable, HttpException } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { SecureRpcService } from "@app/common";

@Injectable()
export class CustomerIdentitiesService {
    constructor(
        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    async getMyProfile(identityId: string) {
        try {
            return await this.secureRpc.send(
                this.identityClient,
                { cmd: "identities.getMyProfile" },
                { id: identityId },
            );
        } catch (err: any) {
            const msg = err?.message || err?.response?.message || "Lỗi lấy thông tin cá nhân";
            const status = typeof err?.statusCode === "number" ? err.statusCode
                : (typeof err?.status === "number" ? err.status : 400);
            throw new HttpException(msg, status);
        }
    }
}
