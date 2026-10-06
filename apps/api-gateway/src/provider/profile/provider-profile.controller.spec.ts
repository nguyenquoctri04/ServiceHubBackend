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
});
