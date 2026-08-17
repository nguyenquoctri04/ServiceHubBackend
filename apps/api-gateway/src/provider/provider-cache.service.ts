import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { GatewayProxyService } from '../proxy/gateway-proxy.service';

interface CacheEntry {
  providerId: string;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ProviderCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
  ) {}

  async resolveProviderId(identityId: string): Promise<string> {
    const now = Date.now();
    const cached = this.cache.get(identityId);
    if (cached && cached.expiresAt > now) {
      return cached.providerId;
    }
    const provider = await this.proxy.send(
      this.identityClient,
      { cmd: 'providers.getProfile' },
      { identityId },
    );
    if (!provider?.id) {
      throw new Error('Provider profile not found');
    }
    this.cache.set(identityId, { providerId: provider.id, expiresAt: now + TTL_MS });
    return provider.id;
  }
}