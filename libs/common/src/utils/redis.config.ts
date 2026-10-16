import { RedisOptions } from 'ioredis';

export function parseRedisUrl(urlStr?: string): RedisOptions {
  if (!urlStr) return { host: 'localhost', port: 6379, keepAlive: 10000 };
  try {
    const redisUrl = new URL(urlStr);
    const isTlsRedis =
      redisUrl.protocol === 'rediss:' || redisUrl.hostname.endsWith('.upstash.io');

    return {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port, 10) || 6379,
      username: redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
      password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
      tls: isTlsRedis ? { rejectUnauthorized: false } : undefined,
      keepAlive: 10000,
      connectTimeout: 10000,
      commandTimeout: 10000,
      retryStrategy: (times) => Math.min(times * 200, 5000),
      maxRetriesPerRequest: 3,
    };
  } catch (e) {
    return { host: 'localhost', port: 6379, keepAlive: 10000 };
  }
}
