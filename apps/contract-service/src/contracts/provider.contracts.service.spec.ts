import { ProviderContractsService } from './provider.contracts.service';

describe('ProviderContractsService.findContracts', () => {
  it('enriches a page with batched identity, room and price lookups', async () => {
    const prisma = {
      contract: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'contract-1', providerId: 'provider-1', customerId: 'customer-1', roomId: 'room-1',
          services: [{ id: 'contract-service-1', servicePriceId: 'price-1', quantity: 1 }],
          terms: [],
        }]),
      },
    };
    const secureRpc = {
      send: jest.fn((_: unknown, pattern: { cmd: string }) => {
        switch (pattern.cmd) {
          case 'provider.identities.batch': return Promise.resolve([{ id: 'customer-1', email: 'customer@example.com', phone: '0900000000' }]);
          case 'catalog.rooms.findByIdsForProvider': return Promise.resolve([{ id: 'room-1', roomNumber: 'A-101' }]);
          case 'services.prices.findForProvider': return Promise.resolve([{ id: 'price-1', price: 150000, service: { name: 'Internet' } }]);
          default: return Promise.resolve(null);
        }
      }),
    };
    const service = new ProviderContractsService(prisma as any, {} as any, {} as any, {} as any, secureRpc as any);

    await expect(service.findContracts({ providerId: 'provider-1', page: 1, limit: 10 })).resolves.toEqual([
      expect.objectContaining({
        customerName: 'customer@example.com',
        customerPhone: '0900000000',
        roomName: 'A-101',
        services: [expect.objectContaining({ serviceName: 'Internet', price: 150000 })],
      }),
    ]);

    expect(secureRpc.send).toHaveBeenCalledWith(expect.anything(), { cmd: 'provider.identities.batch' }, { identityIds: ['customer-1'] });
    expect(secureRpc.send).toHaveBeenCalledWith(expect.anything(), { cmd: 'catalog.rooms.findByIdsForProvider' }, { providerId: 'provider-1', roomIds: ['room-1'] });
    expect(secureRpc.send).toHaveBeenCalledWith(expect.anything(), { cmd: 'services.prices.findForProvider' }, { providerId: 'provider-1', priceIds: ['price-1'] });
    expect(secureRpc.send).toHaveBeenCalledTimes(3);
  });
});
