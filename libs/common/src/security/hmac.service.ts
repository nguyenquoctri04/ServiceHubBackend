import { Injectable } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { SecureRpcRequest } from "./hmac.type";

@Injectable()
export class HmacService {
    private readonly timestampTolerance = 30_000;

    createRequest<T>(
        service: string,
        secret: string,
        data: T,
        pattern: string,
    ): SecureRpcRequest<T> {
        const timestamp = Date.now();
        const requestId = randomUUID();

        const signature = this.createSignature(
            secret,
            service,
            timestamp,
            requestId,
            pattern,
            data,
        );

        return {
            meta: {
                service,
                timestamp,
                requestId,
                pattern,
                signature,
            },
            data,
        };
    }

    verifyRequest<T>(request: SecureRpcRequest<T>, secret: string): boolean {
        const { service, timestamp, requestId, pattern, signature } =
            request.meta;

        if (!service || !timestamp || !requestId || !pattern || !signature) {
            return false;
        }

        const now = Date.now();

        if (Math.abs(now - timestamp) > this.timestampTolerance) {
            return false;
        }

        const expectedSignature = this.createSignature(
            secret,
            service,
            timestamp,
            requestId,
            pattern,
            request.data,
        );

        return this.safeCompare(signature, expectedSignature);
    }

    private createSignature<T>(
        secret: string,
        service: string,
        timestamp: number,
        requestId: string,
        pattern: string,
        data: T,
    ): string {
        const payload = [
            service,
            timestamp,
            requestId,
            pattern,
            JSON.stringify(data),
        ].join(".");

        return createHmac("sha256", secret).update(payload).digest("hex");
    }

    private safeCompare(a: string, b: string): boolean {
        const aBuffer = Buffer.from(a);
        const bBuffer = Buffer.from(b);

        if (aBuffer.length !== bBuffer.length) {
            return false;
        }

        return timingSafeEqual(aBuffer, bBuffer);
    }
}
