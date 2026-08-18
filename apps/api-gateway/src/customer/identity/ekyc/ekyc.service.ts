import { Inject, Injectable, HttpException } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { IsNotEmpty, IsString } from "class-validator";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { SecureRpcService } from "@app/common";
import { AuditEmitterService } from "../../../shared/audit-emitter.service";

export class ApiGatewayExtractOcrDto {
    @IsString()
    @IsNotEmpty()
    frontImage: string;

    @IsString()
    @IsNotEmpty()
    backImage: string;
}

export class ApiGatewayVerifyFaceDto {
    @IsString()
    @IsNotEmpty()
    verificationId: string;

    @IsString()
    @IsNotEmpty()
    selfieImage: string;
}

@Injectable()
export class CustomerEkycService {
    constructor(
        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
        private readonly auditEmitter: AuditEmitterService,
    ) {}

    async extractOcr(dto: ApiGatewayExtractOcrDto, identityId: string) {
        try {
            return await this.secureRpc.send(
                this.identityClient,
                { cmd: CustomerPatterns.EKYC_OCR },
                { ...dto, identityId },
                60000,
            );
        } catch (err: any) {
            console.error("RPC Error in extractOcr:", err);
            const errMsg = err?.message || err?.response?.message || "Lỗi xử lý eKYC OCR";
            const errStatus = typeof err?.statusCode === "number"
                ? err.statusCode
                : (typeof err?.status === "number" ? err.status : 400);
            throw new HttpException(errMsg, errStatus);
        }
    }

    async verifyFace(dto: ApiGatewayVerifyFaceDto, identityId: string) {
        try {
            const result = await this.secureRpc.send(
                this.identityClient,
                { cmd: CustomerPatterns.EKYC_VERIFY_FACE },
                { ...dto, identityId },
                60000,
            );

            // Emit audit event after successful face verification
            const verified = (result as any)?.verified ?? (result as any)?.data?.verified;
            this.auditEmitter.emit({
                userId:      identityId,
                serviceName: 'identity-service',
                action:      verified ? 'OTHER' : 'OTHER',
                entityType:  'IdentityVerification',
                entityId:    dto.verificationId,
                newData:     {
                    verificationId: dto.verificationId,
                    verified,
                    similarityScore: (result as any)?.similarityScore ?? (result as any)?.data?.similarityScore,
                },
                description: verified
                    ? 'Xác thực eKYC khuôn mặt thành công'
                    : 'Xác thực eKYC khuôn mặt thất bại',
            });

            return result;
        } catch (err: any) {
            console.error("RPC Error in verifyFace:", err);
            const errMsg = err?.message || err?.response?.message || "Lỗi xác thực khuôn mặt eKYC";
            const errStatus = typeof err?.statusCode === "number"
                ? err.statusCode
                : (typeof err?.status === "number" ? err.status : 400);
            throw new HttpException(errMsg, errStatus);
        }
    }
}
