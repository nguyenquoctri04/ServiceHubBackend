import { RedisOptions } from 'ioredis';

export function parseRedisUrl(urlStr?: string): RedisOptions {
  if (!urlStr) return { host: 'localhost', port: 6379 };
  try {
    const redisUrl = new URL(urlStr);
    return {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port, 10) || 6379,
      username: redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
      password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
      tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
    };
  } catch (e) {
    return { host: 'localhost', port: 6379 };
  }
}
