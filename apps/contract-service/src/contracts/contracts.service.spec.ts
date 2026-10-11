import { ContractsService } from './contracts.service';


describe('ContractsService', () => {
  it('getStatusDistribution correctly computes percentages', async () => {
    const prisma = {
      contract: {
        groupBy: jest.fn().mockResolvedValue([
          { status: 'ACTIVE', _count: { status: 6 } },
          { status: 'PENDING_SIGNATURE', _count: { status: 3 } },
          { status: 'CANCELLED', _count: { status: 1 } },
        ]),
      },
    };
    const service = new ContractsService(prisma as any, {} as any, {} as any, {} as any);

    const result = await service.getStatusDistribution('provider-1');
    
    expect(result).toEqual({
      active: 60,
      pending: 30,
      churn: 10,
    });
    expect(prisma.contract.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { providerId: 'provider-1' }
    }));
  });

  it('getStatusDistribution handles no contracts', async () => {
    const prisma = {
      contract: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const service = new ContractsService(prisma as any, {} as any, {} as any, {} as any);

    const result = await service.getStatusDistribution('provider-1');
    expect(result).toEqual({ active: 0, pending: 0, churn: 0 });
  });

  it('getExpiringContracts returns expiring contracts', async () => {
    const prisma = {
      contract: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', contractNumber: 'CT-1' }
        ]),
      },
    };
    const service = new ContractsService(prisma as any, {} as any, {} as any, {} as any);

    const result = await service.getExpiringContracts('provider-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ contractNumber: 'CT-1' }));
  });

  it('getRecentContracts returns recent activities', async () => {
    const prisma = {
      contract: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', status: 'DRAFT', contractNumber: 'CT-1', createdAt: new Date() }
        ]),
      },
    };
    const service = new ContractsService(prisma as any, {} as any, {} as any, {} as any);

    const result = await service.getRecentContracts('provider-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ type: 'CONTRACT', color: 'blue' }));
  });
});
