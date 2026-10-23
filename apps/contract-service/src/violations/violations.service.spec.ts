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
          evidence: [{ id: 'ev-1', fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' }],
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
      evidence: [{ id: 'ev-1', fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' }],
    });
    expect(caseForOpponent).toMatchObject({
      reportView: 'REPORTED_AGAINST_ME',
      canProviderProcess: false,
      canProviderAppeal: true,
    });
  });

  it('creates a violation report with evidence and sends notification', async () => {
    const mockContract = { id: 'contract-1', customerId: 'customer-1', status: 'ACTIVE' };
    const mockRule = { id: 'rule-1', name: 'NOISE_DISTURBANCE' };
    const mockViolation = {
      id: 'case-new',
      contractId: 'contract-1',
      evidence: [{ id: 'ev-1', fileUrl: 'https://res.cloudinary.com/demo/image/upload/proof.jpg' }],
    };
    const prisma = {
      contract: { findFirst: jest.fn().mockResolvedValue(mockContract) },
      violationRule: { findFirst: jest.fn().mockResolvedValue(mockRule) },
      violationCase: { create: jest.fn().mockResolvedValue(mockViolation) },
    };
    const secureRpc = { send: jest.fn().mockResolvedValue({ success: true }) };
    const service = new ViolationsService(prisma as any, {} as any, secureRpc as any);

    const result = await service.createReport({
      providerId: 'provider-1',
      contractId: 'contract-1',
      reportedBy: 'provider-user-1',
      description: 'Loud noise late at night',
      violationType: 'NOISE_DISTURBANCE',
      evidenceUrls: ['https://res.cloudinary.com/demo/image/upload/proof.jpg'],
    });

    expect(prisma.violationCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contractId: 'contract-1',
          evidence: {
            create: [{ fileUrl: 'https://res.cloudinary.com/demo/image/upload/proof.jpg' }],
          },
        }),
      }),
    );
    expect(result).toEqual(mockViolation);
  });

  it('creates violation even if notification dispatch fails', async () => {
    const mockContract = { id: 'contract-1', customerId: 'customer-1', status: 'ACTIVE' };
    const mockRule = { id: 'rule-1', name: 'NOISE_DISTURBANCE' };
    const mockViolation = { id: 'case-notif-fail', contractId: 'contract-1' };
    const prisma = {
      contract: { findFirst: jest.fn().mockResolvedValue(mockContract) },
      violationRule: { findFirst: jest.fn().mockResolvedValue(mockRule) },
      violationCase: { create: jest.fn().mockResolvedValue(mockViolation) },
    };
    const secureRpc = { send: jest.fn().mockRejectedValue(new Error('Notification service unavailable')) };
    const service = new ViolationsService(prisma as any, {} as any, secureRpc as any);

    const result = await service.createReport({
      providerId: 'provider-1',
      contractId: 'contract-1',
      reportedBy: 'provider-user-1',
      description: 'Loud noise late at night',
      violationType: 'NOISE_DISTURBANCE',
    });

    expect(result).toEqual(mockViolation);
  });

  it('allows creation for EXPIRED contract within 30 days', async () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    const mockContract = {
      id: 'contract-expired-valid',
      customerId: 'customer-1',
      status: 'EXPIRED',
      endDate: twentyDaysAgo,
    };
    const mockRule = { id: 'rule-1', name: 'PROPERTY_DAMAGE' };
    const mockViolation = { id: 'case-exp', contractId: 'contract-expired-valid' };
    const prisma = {
      contract: { findFirst: jest.fn().mockResolvedValue(mockContract) },
      violationRule: { findFirst: jest.fn().mockResolvedValue(mockRule) },
      violationCase: { create: jest.fn().mockResolvedValue(mockViolation) },
    };
    const secureRpc = { send: jest.fn().mockResolvedValue({ success: true }) };
    const service = new ViolationsService(prisma as any, {} as any, secureRpc as any);

    const result = await service.createReport({
      providerId: 'provider-1',
      contractId: 'contract-expired-valid',
      reportedBy: 'provider-user-1',
      description: 'Hư hỏng tài sản khi trả phòng',
      violationType: 'PROPERTY_DAMAGE',
    });

    expect(result).toEqual(mockViolation);
  });

  it('rejects creation for DRAFT or CANCELLED contract', async () => {
    const mockContract = { id: 'contract-draft', customerId: 'customer-1', status: 'DRAFT' };
    const prisma = {
      contract: { findFirst: jest.fn().mockResolvedValue(mockContract) },
    };
    const service = new ViolationsService(prisma as any, {} as any, {} as any);

    await expect(
      service.createReport({
        providerId: 'provider-1',
        contractId: 'contract-draft',
        reportedBy: 'provider-user-1',
        description: 'Testing draft',
      }),
    ).rejects.toThrow();
  });

  it('rejects creation for EXPIRED contract older than 30 days', async () => {
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const mockContract = {
      id: 'contract-old',
      customerId: 'customer-1',
      status: 'EXPIRED',
      endDate: fortyDaysAgo,
    };
    const prisma = {
      contract: { findFirst: jest.fn().mockResolvedValue(mockContract) },
    };
    const service = new ViolationsService(prisma as any, {} as any, {} as any);

    await expect(
      service.createReport({
        providerId: 'provider-1',
        contractId: 'contract-old',
        reportedBy: 'provider-user-1',
        description: 'Testing expired over 30 days',
      }),
    ).rejects.toThrow();
  });

  it('rejects creation when evidenceUrls exceed 5 items', async () => {
    const mockContract = { id: 'contract-1', customerId: 'customer-1', status: 'ACTIVE' };
    const prisma = {
      contract: { findFirst: jest.fn().mockResolvedValue(mockContract) },
    };
    const service = new ViolationsService(prisma as any, {} as any, {} as any);

    await expect(
      service.createReport({
        providerId: 'provider-1',
        contractId: 'contract-1',
        reportedBy: 'provider-user-1',
        description: 'Testing limit',
        evidenceUrls: [
          'https://res.cloudinary.com/demo/1.jpg',
          'https://res.cloudinary.com/demo/2.jpg',
          'https://res.cloudinary.com/demo/3.jpg',
          'https://res.cloudinary.com/demo/4.jpg',
          'https://res.cloudinary.com/demo/5.jpg',
          'https://res.cloudinary.com/demo/6.jpg',
        ],
      }),
    ).rejects.toThrow();
  });

  it('rejects creation when evidenceUrls contain untrusted or malicious domains', async () => {
    const mockContract = { id: 'contract-1', customerId: 'customer-1', status: 'ACTIVE' };
    const prisma = {
      contract: { findFirst: jest.fn().mockResolvedValue(mockContract) },
    };
    const service = new ViolationsService(prisma as any, {} as any, {} as any);

    await expect(
      service.createReport({
        providerId: 'provider-1',
        contractId: 'contract-1',
        reportedBy: 'provider-user-1',
        description: 'Testing SSRF attempt',
        evidenceUrls: ['http://169.254.169.254/latest/meta-data/'],
      }),
    ).rejects.toThrow();
  });
});
