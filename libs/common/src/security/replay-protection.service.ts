import { Injectable } from "@nestjs/common";
import { RedisService } from "../utils/redis.service";
import { RpcException } from "@nestjs/microservices";

@Injectable()
export class ReplayProtectionService {
    private readonly ttl = 30;

    constructor(private readonly redis: RedisService) {}

    async check(requestId: string): Promise<void> {
        const key = `hmac:request:${requestId}`;

        const result = await this.redis
            .getClient()
            .set(key, "1", "EX", this.ttl, "NX");

        if (result !== "OK") {
            throw new RpcException("Duplicate request");
        }
    }
}
