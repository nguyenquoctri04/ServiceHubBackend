import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { DistanceMatrixProvider } from './providers/distance-matrix.provider';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private redisClient: Redis | null = null;
  private readonly CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

  constructor(
    private readonly distanceMatrixProvider: DistanceMatrixProvider,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_CACHE_URL');
    if (redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl, {
          maxRetriesPerRequest: 1, // Don't block indefinitely
          retryStrategy: (times) => Math.min(times * 50, 2000), // Quick retries
        });
        
        this.redisClient.on('error', (err) => {
          this.logger.warn(`Redis connection error: ${err.message}`);
        });
      } catch (error) {
        this.logger.warn(`Failed to initialize Redis: ${error.message}`);
      }
    }
  }

  /**
   * Chuẩn hoá địa chỉ để dùng làm Cache Key.
   */
  private normalizeAddress(address: string): string {
    return address.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private getGeocodeCacheKey(normalizedAddress: string): string {
    return `geocode:${createHash('sha256').update(normalizedAddress).digest('hex')}`;
  }

  /**
   * Geocode địa chỉ ra tọa độ, có sử dụng Redis Cache (Fail-open).
   */
  async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!address) return null;

    const normalizedAddress = this.normalizeAddress(address);
    const cacheKey = this.getGeocodeCacheKey(normalizedAddress);

    // 1. Try Cache
    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          this.logger.log('Geocode cache HIT');
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn(`Redis get failed (fail-open): ${error.message}`);
      }
    }

    // 2. Call API
    this.logger.log('Geocode cache MISS');
    const location = await this.distanceMatrixProvider.geocode(address);

    // 3. Save Cache
    if (location && this.redisClient && this.redisClient.status === 'ready') {
      try {
        await this.redisClient.set(cacheKey, JSON.stringify(location), 'EX', this.CACHE_TTL_SECONDS);
      } catch (error) {
        this.logger.warn(`Redis set failed: ${error.message}`);
      }
    }

    return location;
  }

  /**
   * Tính khoảng cách đường đi.
   */
  async getDistanceKm(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<number | null> {
    return this.distanceMatrixProvider.getDistanceKm(origin, destination);
  }

  /**
   * Tính khoảng cách Haversine (đường chim bay) giữa 2 tọa độ (đơn vị: km).
   */
  calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Bán kính Trái đất (km)
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
