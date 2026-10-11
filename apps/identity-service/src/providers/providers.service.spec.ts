import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersService } from './providers.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';

const mockPrismaService = {
  provider: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  identity: {
    findUnique: jest.fn(),
  },
  providerLegalDocument: {
    create: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('5'),
};

describe('ProvidersService', () => {
  let service: ProvidersService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProviderProfile', () => {
    it('should return provider profile', async () => {
      const mockProvider = {
        id: 'provider-1',
        identityId: 'identity-1',
        legalDocuments: [],
        identity: {
          email: 'test@test.com',
          phone: '123456',
          status: 'ACTIVE',
          isEkycVerified: true,
          role: { name: 'PROVIDER' },
        },
      };

      prisma.provider.findFirst.mockResolvedValue(mockProvider);

      const result = await service.getProviderProfile('identity-1');

      expect(prisma.provider.findFirst).toHaveBeenCalledWith({
        where: { identityId: 'identity-1' },
        include: expect.any(Object),
      });
      expect(result).toEqual({
        ...mockProvider,
        systemSettings: { distanceWarningKm: 5 },
      });
    });

    it('should throw RpcException if provider not found', async () => {
      prisma.provider.findFirst.mockResolvedValue(null);

      await expect(service.getProviderProfile('identity-1')).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('updateProviderProfile', () => {
    it('should update provider profile', async () => {
      const existing = { id: 'provider-1', identityId: 'identity-1' };
      prisma.provider.findFirst.mockResolvedValue(existing);
      
      const dto: UpdateProviderProfileDto = { providerName: 'New Name' };
      const updated = { ...existing, ...dto };
      prisma.provider.update.mockResolvedValue(updated);

      const result = await service.updateProviderProfile('identity-1', dto);

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: expect.objectContaining({
          providerName: 'New Name',
        }),
        include: { legalDocuments: true },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('getProviderById', () => {
    it('should return provider rpc summary', async () => {
      const provider = {
        id: 'prov-1',
        identityId: 'ident-1',
        providerName: 'Test',
        providerType: 'PROPERTY_MANAGER',
        status: 'ACTIVE',
        address: '123 Main St',
      };
      prisma.provider.findUnique.mockResolvedValue(provider);

      const result = await service.getProviderById('prov-1');
      expect(result).toEqual(provider);
      expect(prisma.provider.findUnique).toHaveBeenCalledWith({
        where: { id: 'prov-1' },
        select: expect.any(Object),
      });
    });

    it('should throw if not found', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);
      await expect(service.getProviderById('prov-1')).rejects.toThrow(RpcException);
    });
  });

  describe('getProviderByIdForIdentity', () => {
    it('should return provider if found', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 'prov-1' });
      const result = await service.getProviderByIdForIdentity('ident-1', 'prov-1');
      expect(result).toEqual({ id: 'prov-1' });
      expect(prisma.provider.findFirst).toHaveBeenCalledWith({
        where: { id: 'prov-1', identityId: 'ident-1' },
        select: { id: true },
      });
    });
  });

  describe('addLegalDocument', () => {
    it('should add legal document', async () => {
      const provider = { id: 'prov-1' };
      prisma.provider.findFirst.mockResolvedValue(provider);
      
      const dto: CreateLegalDocumentDto = {
        documentType: 'ID_CARD' as any,
        documentName: 'ID',
        documentNumber: '123',
        fileUrl: 'url',
      };

      const doc = { id: 'doc-1', ...dto };
      prisma.providerLegalDocument.create.mockResolvedValue(doc);

      const result = await service.addLegalDocument('ident-1', dto);
      expect(prisma.providerLegalDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerId: 'prov-1',
          documentType: 'ID_CARD',
        }),
      });
      expect(result).toEqual(doc);
    });
  });

  describe('getMyProviders', () => {
    it('should return list of providers', async () => {
      const providers = [{ id: 'prov-1' }];
      prisma.provider.findMany.mockResolvedValue(providers);
      
      const result = await service.getMyProviders('ident-1');
      expect(result).toEqual(providers);
      expect(prisma.provider.findMany).toHaveBeenCalledWith({
        where: { identityId: 'ident-1' },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('createProvider', () => {
    it('should create provider', async () => {
      prisma.identity.findUnique.mockResolvedValue({ id: 'ident-1' });
      
      const dto: CreateProviderDto = {
        providerName: 'Test',
        providerType: 'PROPERTY_MANAGER' as any,
        businessType: 'INDIVIDUAL' as any,
      };

      const provider = { id: 'prov-1', ...dto };
      prisma.provider.create.mockResolvedValue(provider);

      const result = await service.createProvider('ident-1', dto);
      
      expect(prisma.provider.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          identityId: 'ident-1',
          providerName: 'Test',
          status: 'PENDING',
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(provider);
    });
  });
});
