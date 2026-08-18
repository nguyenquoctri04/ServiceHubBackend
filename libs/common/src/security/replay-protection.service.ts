import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../utils/redis.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ReplayProtectionService {
    private readonly ttl = 30;
    private readonly timeoutMs = 2000; // 2s timeout cho Upstash
    private readonly logger = new Logger(ReplayProtectionService.name);

    constructor(private readonly redis: RedisService) {}

    async check(requestId: string): Promise<void> {
        const key = `hmac:request:${requestId}`;

        let result: string | null;
        try {
            const client = this.redis.getClient();
            if (client.status !== 'ready') {
                throw new Error(`Redis is not ready (status=${client.status})`);
            }

            // Race giữa lệnh Redis và timeout ngắn để tránh treo RPC chain
            result = await Promise.race<string | null>([
                client.set(key, '1', 'EX', this.ttl, 'NX'),
                new Promise<null>((_, reject) =>
                    setTimeout(
                        () => reject(new Error('ReplayProtection Redis timeout')),
                        this.timeoutMs,
                    ),
                ),
            ]);
        } catch (err: any) {
            // Nếu Redis cache không phản hồi, log cảnh báo và cho phép request đi tiếp
            // (fail-open) để tránh làm tê liệt toàn bộ hệ thống khi Upstash sập.
            this.logger.warn(
                `ReplayProtection check skipped (${err?.message ?? err}). ` +
                `requestId=${requestId}`,
            );
            return;
        }

        if (result !== 'OK') {
            throw new RpcException({ message: 'Duplicate request', statusCode: 429 });
        }
    }
}

