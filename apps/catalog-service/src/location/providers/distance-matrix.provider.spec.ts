import { DistanceMatrixProvider } from './distance-matrix.provider';

describe('DistanceMatrixProvider.geocode', () => {
  const originalFetch = global.fetch;
  const config = { get: jest.fn((key: string) => key === 'GEOCODING_FAST_API_KEY' ? 'test-key' : '') };

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('accepts only finite coordinates within valid geographic bounds', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'OK', results: [{ geometry: { location: { lat: 10.7769, lng: 106.7009 } } }] }),
    }) as unknown as typeof fetch;
    const provider = new DistanceMatrixProvider(config as any);

    await expect(provider.geocode('Quận 1, TP. Hồ Chí Minh')).resolves.toEqual({ lat: 10.7769, lng: 106.7009 });
  });

  it('rejects malformed geocoding payloads before they can reach persistence', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'OK', results: [{ geometry: { location: { lat: 999, lng: 'invalid' } } }] }),
    }) as unknown as typeof fetch;
    const provider = new DistanceMatrixProvider(config as any);

    await expect(provider.geocode('Địa chỉ thử nghiệm')).resolves.toBeNull();
  });
});
