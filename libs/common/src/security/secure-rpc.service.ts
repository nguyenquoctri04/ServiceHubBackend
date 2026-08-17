import { Inject, Injectable, RequestTimeoutException } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom, throwError } from "rxjs";
import { timeout, catchError } from "rxjs/operators";
import { HmacService } from "./hmac.service";
import { ServiceIdentity } from "./hmac.type";

export const SERVICE_IDENTITY = "SERVICE_IDENTITY";

@Injectable()
export class SecureRpcService {
    constructor(
        private readonly hmacService: HmacService,

        @Inject(SERVICE_IDENTITY)
        private readonly identity: ServiceIdentity,
    ) {}

    async send<T = any>(
        client: ClientProxy,
        pattern: string | object,
        data: any = {},
    ): Promise<T> {
        const patternKey =
            typeof pattern === "string" ? pattern : JSON.stringify(pattern);

        const request = this.hmacService.createRequest(
            this.identity.name,
            this.identity.secret,
            data,
            patternKey,
        );

        return firstValueFrom(
            client.send<T>(pattern, request).pipe(
                timeout(15000),
                catchError(err => {
                    if (err && err.name === 'TimeoutError') {
                        return throwError(() => new RequestTimeoutException('Service unavailable or timed out'));
                    }
                    return throwError(() => err);
                })
            )
        );
    }
}
