import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { parseRedisUrl } from './redis.config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly commandTimeoutMs = 3000;
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    // Sử dụng REDIS_CACHE_URL (Upstash) chuyên dụng cho việc lưu trữ cache
    const redisUrl = this.configService.get<string>('REDIS_CACHE_URL');
    const options = parseRedisUrl(redisUrl);
    this.client = new Redis(options);

    this.client.on('connect', () => this.logger.log('Connected to Redis server'));
    this.client.on('error', (err: any) => {
      if (err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') {
        this.logger.warn(`Redis Connection Reset (${err?.code}), reconnecting automatically...`);
      } else {
        this.logger.error('Redis Client Error:', err);
      }
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.withTimeout(this.client.set(key, value, 'EX', ttlSeconds));
    }
    return this.withTimeout(this.client.set(key, value));
  }

  async get(key: string): Promise<string | null> {
    return this.withTimeout(this.client.get(key));
  }

  async del(key: string): Promise<number> {
    return this.withTimeout(this.client.del(key));
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Redis command timeout')),
        this.commandTimeoutMs,
      );
    });

    try {
      return await Promise.race([operation, timeout]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
