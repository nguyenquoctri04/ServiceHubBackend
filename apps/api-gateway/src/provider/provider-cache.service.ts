import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ForbiddenException } from '@nestjs/common';
import { GatewayProxyService } from '../proxy/gateway-proxy.service';

interface CacheEntry {
  providerId: string;
  expiresAt: number;
}

interface ActiveProviderUser {
  id: string;
  providerId?: string;
}

const TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ProviderCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
  ) {}

  async resolveActiveProvider(user: ActiveProviderUser): Promise<string> {
    const { id: identityId, providerId } = user;
    if (!providerId) {
      throw new ForbiddenException('Chưa chọn không gian làm việc nhà cung cấp.');
    }

    const cacheKey = `${identityId}:${providerId}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.providerId;
    }
    const provider = await this.proxy.send(
      this.identityClient,
      { cmd: 'providers.getByIdForIdentity' },
      { identityId, providerId },
    );
    if (provider?.id !== providerId) {
      throw new ForbiddenException('Không có quyền truy cập không gian làm việc nhà cung cấp này.');
    }
    this.cache.set(cacheKey, { providerId, expiresAt: now + TTL_MS });
    return providerId;
  }
}
