import { Injectable } from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";
import { RedisService } from "../utils/redis.service";
import { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";

/**
 * ThrottlerStorage backed bởi Redis (dùng chung Redis instance với
 * RedisService — REDIS_CACHE_URL), thay cho storage in-memory mặc định
 * của @nestjs/throttler.
 *
 * Lý do cần Redis thay vì in-memory:
 * - In-memory storage KHÔNG chia sẻ giữa nhiều instance của api-gateway
 *   khi scale ngang (mỗi instance đếm request riêng => rate limit vô nghĩa
 *   khi có load balancer trước nhiều container).
 * - Counter mất khi container restart/deploy, in-memory không sống sót
 *   qua restart, dễ bị "reset" limit bởi kẻ tấn công (deploy loop, crash loop).
 *
 * Thuật toán: fixed window counter, atomic bằng Lua script để tránh race
 * condition giữa các request đến gần như đồng thời (INCR + PEXPIRE riêng lẻ
 * không atomic, có thể tạo key không có TTL nếu process chết giữa 2 lệnh).
 */
@Injectable()
export class RedisThrottlerStorageService implements ThrottlerStorage {
    // Bắt buộc bởi interface ThrottlerStorage, nhưng vì state thật sự nằm ở
    // Redis nên field này không được dùng — giữ lại chỉ để thoả type.
    storage: Record<string, ThrottlerStorageRecord> = {};

    private static readonly LUA_SCRIPT = `
        local hitsKey = KEYS[1]
        local blockKey = KEYS[2]
        local ttl = tonumber(ARGV[1])
        local limit = tonumber(ARGV[2])
        local blockDuration = tonumber(ARGV[3])

        local blockPttl = redis.call('PTTL', blockKey)
        if blockPttl and blockPttl > 0 then
            local hits = tonumber(redis.call('GET', hitsKey)) or limit + 1
            return { hits, redis.call('PTTL', hitsKey), 1, blockPttl }
        end

        local totalHits = redis.call('INCR', hitsKey)
        if totalHits == 1 then
            redis.call('PEXPIRE', hitsKey, ttl)
        end

        local timeToExpire = redis.call('PTTL', hitsKey)
        local isBlocked = 0
        local timeToBlockExpire = 0

        if totalHits > limit and blockDuration > 0 then
            redis.call('SET', blockKey, 1, 'PX', blockDuration)
            isBlocked = 1
            timeToBlockExpire = blockDuration
        end

        return { totalHits, timeToExpire, isBlocked, timeToBlockExpire }
    `;

    constructor(private readonly redisService: RedisService) {}

    async increment(
        key: string,
        ttl: number,
        limit: number,
        blockDuration: number,
        throttlerName: string,
    ): Promise<ThrottlerStorageRecord> {
        const client = this.redisService.getClient();

        const hitsKey = `throttle:{${throttlerName}}:${key}`;
        const blockKey = `throttle:block:{${throttlerName}}:${key}`;

        // {throttlerName} làm hash tag để 2 key luôn cùng slot nếu sau này
        // chuyển sang Redis Cluster (Lua script yêu cầu các KEYS cùng slot).
        const [totalHits, timeToExpirePx, isBlocked, timeToBlockExpirePx] =
            (await client.eval(
                RedisThrottlerStorageService.LUA_SCRIPT,
                2,
                hitsKey,
                blockKey,
                ttl,
                limit,
                blockDuration,
            )) as [number, number, number, number];

        return {
            totalHits,
            timeToExpire: Math.ceil(timeToExpirePx / 1000),
            isBlocked: isBlocked === 1,
            timeToBlockExpire: Math.ceil(timeToBlockExpirePx / 1000),
        };
    }
}
