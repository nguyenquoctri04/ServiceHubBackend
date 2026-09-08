import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';

const mockProvidersService = {
  getProviderProfile: jest.fn(),
  updateProviderProfile: jest.fn(),
  getProviderById: jest.fn(),
  getProviderByIdForIdentity: jest.fn(),
  addLegalDocument: jest.fn(),
  getMyProviders: jest.fn(),
  createProvider: jest.fn(),
};

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let service: typeof mockProvidersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [
        { provide: ProvidersService, useValue: mockProvidersService },
      ],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
    service = module.get(ProvidersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return provider profile', async () => {
      const mockResult = { id: 'prov-1' };
      service.getProviderProfile.mockResolvedValue(mockResult);

      const result = await controller.getProfile({ identityId: 'ident-1', providerId: 'prov-1' });
      expect(result).toEqual(mockResult);
      expect(service.getProviderProfile).toHaveBeenCalledWith('ident-1', 'prov-1');
    });
  });

  describe('updateProfile', () => {
    it('should update provider profile', async () => {
      const mockResult = { id: 'prov-1' };
      const dto = new UpdateProviderProfileDto();
      service.updateProviderProfile.mockResolvedValue(mockResult);

      const result = await controller.updateProfile({ identityId: 'ident-1', providerId: 'prov-1', dto });
      expect(result).toEqual(mockResult);
      expect(service.updateProviderProfile).toHaveBeenCalledWith('ident-1', dto, 'prov-1');
    });
  });

  describe('getProviderById', () => {
    it('should return provider', async () => {
      const mockResult = { id: 'prov-1' };
      service.getProviderById.mockResolvedValue(mockResult);

      const result = await controller.getProviderById('prov-1');
      expect(result).toEqual(mockResult);
      expect(service.getProviderById).toHaveBeenCalledWith('prov-1');
    });
  });

  describe('getProviderByIdForIdentity', () => {
    it('should return provider for identity', async () => {
      const mockResult = { id: 'prov-1' };
      service.getProviderByIdForIdentity.mockResolvedValue(mockResult);

      const result = await controller.getProviderByIdForIdentity({ identityId: 'ident-1', providerId: 'prov-1' });
      expect(result).toEqual(mockResult);
      expect(service.getProviderByIdForIdentity).toHaveBeenCalledWith('ident-1', 'prov-1');
    });
  });

  describe('addLegalDocument', () => {
    it('should add legal document', async () => {
      const mockResult = { id: 'doc-1' };
      const dto = new CreateLegalDocumentDto();
      service.addLegalDocument.mockResolvedValue(mockResult);

      const result = await controller.addLegalDocument({ identityId: 'ident-1', providerId: 'prov-1', dto });
      expect(result).toEqual(mockResult);
      expect(service.addLegalDocument).toHaveBeenCalledWith('ident-1', dto, 'prov-1');
    });
  });

  describe('getMyProviders', () => {
    it('should return my providers', async () => {
      const mockResult = [{ id: 'prov-1' }];
      service.getMyProviders.mockResolvedValue(mockResult);

      const result = await controller.getMyProviders('ident-1');
      expect(result).toEqual(mockResult);
      expect(service.getMyProviders).toHaveBeenCalledWith('ident-1');
    });
  });

  describe('createProvider', () => {
    it('should create provider', async () => {
      const mockResult = { id: 'prov-1' };
      const dto = new CreateProviderDto();
      service.createProvider.mockResolvedValue(mockResult);

      const result = await controller.createProvider({ identityId: 'ident-1', dto });
      expect(result).toEqual(mockResult);
      expect(service.createProvider).toHaveBeenCalledWith('ident-1', dto);
    });
  });
});
