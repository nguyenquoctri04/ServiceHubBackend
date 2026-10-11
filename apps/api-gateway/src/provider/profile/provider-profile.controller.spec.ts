import { Test, TestingModule } from '@nestjs/testing';
import { ProviderProfileController } from './provider-profile.controller';
import { ProviderCacheService } from '../provider-cache.service';
import { ProviderBffService } from '../provider-bff.service';
import { GatewayProxyService } from '../../proxy/gateway-proxy.service';
import { UpdateProviderProfileDto } from '../dto/update-provider-profile.dto';
import { CreateLegalDocumentDto } from '../dto/create-legal-document.dto';

const mockProviderCacheService = {
  resolveActiveProvider: jest.fn().mockResolvedValue('provider-1'),
};

const mockGatewayProxyService = {
  send: jest.fn(),
};

describe('ProviderProfileController', () => {
  let controller: ProviderProfileController;
  let proxy: typeof mockGatewayProxyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderProfileController],
      providers: [
        { provide: ProviderCacheService, useValue: mockProviderCacheService },
        { provide: ProviderBffService, useValue: {} },
        { provide: GatewayProxyService, useValue: mockGatewayProxyService },
        { provide: 'IDENTITY_SERVICE', useValue: {} },
        { provide: 'CATALOG_SERVICE', useValue: {} },
        { provide: 'CONTRACT_SERVICE', useValue: {} },
        { provide: 'BILLING_SERVICE', useValue: {} },
        { provide: 'NOTIFICATION_SERVICE', useValue: {} },
      ],
    }).compile();

    controller = module.get<ProviderProfileController>(ProviderProfileController);
    proxy = module.get(GatewayProxyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should get profile via identity client', async () => {
      proxy.send.mockResolvedValue({ id: 'provider-1' });
      const user = { id: 'user-1', email: 'test@test.com', role: 'PROVIDER' };
      const result = await controller.getProfile(user);
      expect(result).toEqual({ id: 'provider-1' });
      expect(proxy.send).toHaveBeenCalledWith(
        expect.anything(),
        { cmd: 'providers.getProfile' },
        { identityId: 'user-1', providerId: 'provider-1' }
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile via identity client', async () => {
      proxy.send.mockResolvedValue({ id: 'provider-1' });
      const user = { id: 'user-1', email: 'test@test.com', role: 'PROVIDER' };
      const dto = new UpdateProviderProfileDto();
      const result = await controller.updateProfile(user, dto);
      expect(result).toEqual({ id: 'provider-1' });
      expect(proxy.send).toHaveBeenCalledWith(
        expect.anything(),
        { cmd: 'providers.updateProfile' },
        { identityId: 'user-1', providerId: 'provider-1', dto }
      );
    });
  });

  describe('addLegalDocument', () => {
    it('should add legal document via identity client', async () => {
      proxy.send.mockResolvedValue({ id: 'doc-1' });
      const user = { id: 'user-1', email: 'test@test.com', role: 'PROVIDER' };
      const dto = new CreateLegalDocumentDto();
      const result = await controller.addLegalDocument(user, dto);
      expect(result).toEqual({ id: 'doc-1' });
      expect(proxy.send).toHaveBeenCalledWith(
        expect.anything(),
        { cmd: 'providers.addLegalDocument' },
        { identityId: 'user-1', providerId: 'provider-1', dto }
      );
    });
  });

  describe('getAdvancedStats', () => {
    it('should aggregate advanced stats from multiple services', async () => {
      // Mock Promise.allSettled resolutions by implementing a sequence or based on command
      proxy.send.mockImplementation((client: any, pattern: any, payload: any) => {
        if (pattern.cmd === 'billing.invoices.revenueGrowth') return Promise.resolve([{ month: '01/2026', total: 5000 }]);
        if (pattern.cmd === 'contract.statusDistribution') return Promise.resolve({ active: 60, pending: 30, churn: 10 });
        if (pattern.cmd === 'billing.invoices.aging') return Promise.resolve({ paid: 50, unpaid: 30, overdue: 20 });
        if (pattern.cmd === 'billing.invoices.recentPayments') return Promise.resolve([{ id: 'p1', timestamp: new Date() }]);
        if (pattern.cmd === 'contract.recent') return Promise.resolve([{ id: 'c1', timestamp: new Date(Date.now() - 1000) }]);
        if (pattern.cmd === 'contract.expiring') return Promise.resolve([{ id: 'c2' }]);
        return Promise.resolve([]);
      });

      const user = { id: 'user-1', email: 'test@test.com', role: 'PROVIDER' };
      const result = await controller.getAdvancedStats(user);

      expect(result.revenueGrowth).toEqual([{ month: '01/2026', total: 5000 }]);
      expect(result.contractDistribution).toEqual({ active: 60, pending: 30, churn: 10 });
      expect(result.invoiceAging).toEqual({ paid: 50, unpaid: 30, overdue: 20 });
      expect(result.alerts).toHaveLength(1);
      expect(result.activities).toHaveLength(2);
      expect(proxy.send).toHaveBeenCalledTimes(6);
    });

    it('should handle partial service failures gracefully', async () => {
      proxy.send.mockImplementation((client: any, pattern: any, payload: any) => {
        if (pattern.cmd === 'billing.invoices.revenueGrowth') return Promise.reject(new Error('Billing down'));
        return Promise.resolve([]);
      });

      const user = { id: 'user-1', email: 'test@test.com', role: 'PROVIDER' };
      const result = await controller.getAdvancedStats(user);

      expect(result.revenueGrowth).toEqual([]);
      expect(result.contractDistribution).toBeDefined();
    });
  });
});
