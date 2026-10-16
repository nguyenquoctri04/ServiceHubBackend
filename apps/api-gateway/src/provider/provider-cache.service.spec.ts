import { ForbiddenException } from '@nestjs/common';
import { ProviderCacheService } from './provider-cache.service';

describe('ProviderCacheService', () => {
  const identityClient = {} as any;
  const proxy = {
    send: jest.fn(),
  } as any;

  let service: ProviderCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProviderCacheService(identityClient, proxy);
  });

  it('resolves the provider selected in the JWT only after ownership is verified', async () => {
    proxy.send.mockResolvedValue({ id: 'provider-b' });

    await expect(
      service.resolveActiveProvider({ id: 'identity-1', providerId: 'provider-b' }),
    ).resolves.toBe('provider-b');

    expect(proxy.send).toHaveBeenCalledWith(
      identityClient,
      { cmd: 'providers.getByIdForIdentity' },
      { identityId: 'identity-1', providerId: 'provider-b' },
    );
  });

  it('rejects a provider claim when it is not owned by the authenticated identity', async () => {
    proxy.send.mockResolvedValue(null);

    await expect(
      service.resolveActiveProvider({ id: 'identity-1', providerId: 'provider-other' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a provider request that does not carry an active workspace', async () => {
    await expect(service.resolveActiveProvider({ id: 'identity-1' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(proxy.send).not.toHaveBeenCalled();
  });
});
