import { ViolationsService } from './violations.service';

describe('ViolationsService.findByProvider', () => {
  const makeService = () => {
    const prisma = {
      violationCase: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'case-1',
          contractId: 'contract-1',
          reportedBy: 'provider-user-1',
          status: 'REPORTED',
          description: 'Mô tả vi phạm',
          occurredAt: new Date('2026-08-01T00:00:00.000Z'),
          violationRule: { name: 'OTHER' },
          contract: { contractNumber: 'HD-001' },
          actions: [],
          appeals: [],
        }]),
      },
    };
    return { service: new ViolationsService(prisma as any, {} as any, {} as any), prisma };
  };

  it('does not expose reporter identity and derives permissions from the active actor', async () => {
    const { service } = makeService();

    const [caseForReporter] = await service.findByProvider('provider-1', 'provider-user-1');
    const [caseForOpponent] = await service.findByProvider('provider-1', 'customer-user-1');

    expect(caseForReporter).not.toHaveProperty('reportedBy');
    expect(caseForReporter).toMatchObject({
      reportView: 'REPORTED_BY_ME',
      canProviderProcess: true,
      canProviderAppeal: false,
    });
    expect(caseForOpponent).toMatchObject({
      reportView: 'REPORTED_AGAINST_ME',
      canProviderProcess: false,
      canProviderAppeal: true,
    });
  });
});
