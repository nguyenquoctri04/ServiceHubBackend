import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "../utils/redis.service";
import { RedisThrottlerStorageService } from "../rate-limit/redis-throttler-storage.service";

/**
 * Rate limit riêng, chặt hơn default, CHỈ áp cho các route được gắn thủ
 * công bằng @UseGuards(AuthThrottleGuard) — ví dụ login/register/refresh.
 *
 * Tách biệt hoàn toàn khỏi ThrottlerGuard toàn cục (RateLimitModule) để
 * tránh lỗi: throttler khai trong mảng `throttlers` của ThrottlerModule
 * áp dụng cho MỌI route toàn cục, không riêng route nào — xem comment
 * trong rate-limit.module.ts.
 */
@Injectable()
export class AuthThrottleGuard implements CanActivate {
    private readonly storage: RedisThrottlerStorageService;

    constructor(
        private readonly config: ConfigService,
        redisService: RedisService,
    ) {
        this.storage = new RedisThrottlerStorageService(redisService);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const tracker: string = request.ip;

        const limit = this.config.get<number>("AUTH_RATE_LIMIT_LIMIT", 5);
        const ttlMs =
            this.config.get<number>("AUTH_RATE_LIMIT_TTL_SECONDS", 60) * 1000;
        const blockMs =
            this.config.get<number>("AUTH_RATE_LIMIT_BLOCK_SECONDS", 300) *
            1000;

        const record = await this.storage.increment(
            tracker,
            ttlMs,
            limit,
            blockMs,
            "auth",
        );

        if (record.isBlocked) {
            throw new HttpException(
                "Quá nhiều request đăng nhập/đăng ký, vui lòng thử lại sau.",
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        return true;
    }
}
