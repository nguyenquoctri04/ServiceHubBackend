import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, seconds } from "@nestjs/throttler";
import { RedisService } from "../utils/redis.service";
import { RedisThrottlerStorageService } from "./redis-throttler-storage.service";

/**
 * Rate limit toàn cục cho HTTP entrypoint (api-gateway) — áp cho MỌI route.
 *
 * CHỈ có 1 throttler "default" ở đây. Giới hạn chặt hơn riêng cho
 * login/register/refresh KHÔNG đặt trong module này — vì @nestjs/throttler
 * áp mọi throttler khai trong mảng `throttlers` cho MỌI route toàn cục,
 * không có cách nào giới hạn 1 throttler chỉ cho vài route cụ thể mà không
 * phải @SkipThrottle() thủ công trên từng controller còn lại. Giới hạn
 * riêng cho auth được xử lý bằng AuthThrottleGuard (xem auth-throttle.guard.ts),
 * gắn thủ công bằng @UseGuards() chỉ trên 3 route cần thiết.
 */
@Module({
    imports: [
        ConfigModule,
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                throttlers: [
                    {
                        name: "default",
                        ttl: seconds(
                            config.get<number>("RATE_LIMIT_TTL_SECONDS", 60),
                        ),
                        limit: config.get<number>("RATE_LIMIT_LIMIT", 100),
                    },
                ],
                storage: new RedisThrottlerStorageService(
                    new RedisService(config),
                ),
                errorMessage: "Quá nhiều request, vui lòng thử lại sau.",
            }),
        }),
    ],
    exports: [ThrottlerModule],
})
export class RateLimitModule {}
