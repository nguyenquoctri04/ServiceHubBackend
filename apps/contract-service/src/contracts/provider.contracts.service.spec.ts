import { ProviderContractsService } from './provider.contracts.service';

describe('ProviderContractsService.findContracts', () => {
  it('enriches a page with batched identity, room and price lookups', async () => {
    const prisma = {
      contract: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'contract-1', providerId: 'provider-1', customerId: 'customer-1', roomId: 'room-1',
          services: [{ id: 'contract-service-1', servicePriceId: 'price-1', quantity: 1 }],
          terms: [{ term: { id: 'term-1', content: 'Điều khoản kiểm thử', status: 'ACTIVE' } }],
        }]),
      },
    };
    const secureRpc = {
      send: jest.fn((_: unknown, pattern: { cmd: string }) => {
        switch (pattern.cmd) {
          case 'provider.identities.batch': return Promise.resolve([{ id: 'customer-1', fullName: 'Nguyễn Văn A', email: 'customer@example.com', phone: '0900000000' }]);
          case 'catalog.rooms.findByIdsForProvider': return Promise.resolve([{ id: 'room-1', roomNumber: 'A-101' }]);
          case 'services.prices.findForProvider': return Promise.resolve([{ id: 'price-1', price: 150000, service: { name: 'Internet' } }]);
          default: return Promise.resolve(null);
        }
      }),
    };
    const service = new ProviderContractsService(prisma as any, {} as any, {} as any, {} as any, secureRpc as any, {} as any);

    await expect(service.findContracts({ providerId: 'provider-1', page: 1, limit: 10 })).resolves.toEqual([
      expect.objectContaining({
        customerName: 'Nguyễn Văn A',
        customerPhone: '0900000000',
        roomName: 'A-101',
        services: [expect.objectContaining({ serviceName: 'Internet', price: 150000 })],
        terms: [{ id: 'term-1', content: 'Điều khoản kiểm thử', status: 'ACTIVE' }],
      }),
    ]);

    expect(secureRpc.send).toHaveBeenCalledWith(expect.anything(), { cmd: 'provider.identities.batch' }, { identityIds: ['customer-1'] });
    expect(secureRpc.send).toHaveBeenCalledWith(expect.anything(), { cmd: 'catalog.rooms.findByIdsForProvider' }, { providerId: 'provider-1', roomIds: ['room-1'] });
    expect(secureRpc.send).toHaveBeenCalledWith(expect.anything(), { cmd: 'services.prices.findForProvider' }, { providerId: 'provider-1', priceIds: ['price-1'] });
    expect(secureRpc.send).toHaveBeenCalledTimes(3);
    expect(prisma.contract.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ template: true }),
    }));
  });

  it('reports room references only inside the active provider workspace', async () => {
    const prisma = { contract: { count: jest.fn().mockResolvedValue(1) } };
    const service = new ProviderContractsService(prisma as any, {} as any, {} as any, {} as any, {} as any, {} as any);

    await expect(service.hasRoomReferences('provider-1', 'room-1')).resolves.toEqual({ hasReferences: true });
    expect(prisma.contract.count).toHaveBeenCalledWith({
      where: { providerId: 'provider-1', roomId: 'room-1', status: { in: ['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE'] } },
    });
  });

  it('requires a reason and notifies the customer when a provider declines a contract', async () => {
    const prisma = {
      contract: {
        findFirst: jest.fn().mockResolvedValue({ id: 'contract-1', providerId: 'provider-1', customerId: 'customer-1', contractNumber: 'YCDV-001', status: 'DRAFT' }),
        update: jest.fn().mockResolvedValue({ id: 'contract-1', customerId: 'customer-1', contractNumber: 'YCDV-001', status: 'CANCELLED' }),
      },
    };
    const secureRpc = { send: jest.fn().mockResolvedValue(undefined) };
    const service = new ProviderContractsService(prisma as any, {} as any, {} as any, {} as any, secureRpc as any, {} as any);

    await expect(service.cancelContract('provider-1', 'contract-1', '')).rejects.toMatchObject({ message: expect.stringContaining('lý do') });

    await expect(service.cancelContract('provider-1', 'contract-1', 'Không còn năng lực cung cấp dịch vụ.')).resolves.toMatchObject({ id: 'contract-1', status: 'CANCELLED' });
    expect(secureRpc.send).toHaveBeenCalledWith(expect.anything(), { cmd: 'notifications.createInApp' }, expect.objectContaining({
      userId: 'customer-1',
      providerId: 'provider-1',
      content: expect.stringContaining('Không còn năng lực cung cấp dịch vụ.'),
    }));
  });
});
