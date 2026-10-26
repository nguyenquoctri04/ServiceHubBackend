import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SecureRpcService } from '@app/common';
import { CustomerPatterns } from '@app/common/constants/customer.patterns';

@Injectable()
export class CustomerEkycService {
    constructor(
        @Inject('IDENTITY_SERVICE')
        private readonly identityClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async submitVerification(
        identityId:       string,
        frontImageBuffer: Buffer,
        selfieImageBuffer: Buffer,
        frontImageUrl?:   string,
        selfieImageUrl?:  string,
    ) {
        return this.secureRpc.send(
            this.identityClient,
            { cmd: CustomerPatterns.SUBMIT_EKYC },
            {
                identityId,
                frontImageBuffer,
                selfieImageBuffer,
                frontImageUrl,
                selfieImageUrl,
            },
        );
    }

    async ocrCccd(identityId: string, frontImageBuffer: Buffer) {
        return this.secureRpc.send(
            this.identityClient,
            { cmd: CustomerPatterns.OCR },
            { identityId, frontImageBuffer },
            70000,
        );
    }

    async verifyFace(
        identityId:        string,
        frontImageBuffer:  Buffer,
        selfieImageBuffer: Buffer,
    ) {
        return this.secureRpc.send(
            this.identityClient,
            { cmd: CustomerPatterns.VERIFY_FACE },
            { identityId, frontImageBuffer, selfieImageBuffer },
            70000,
        );
    }
}
