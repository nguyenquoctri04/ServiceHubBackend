import { Test, TestingModule } from '@nestjs/testing';
import { ProviderServiceService } from './provider-service.service';
import { PrismaService } from './prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client-provider';

describe('ProviderServiceService', () => {
  let service: ProviderServiceService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderServiceService,
        {
          provide: PrismaService,
          useValue: prismaMock, // Inject Mock Prisma
        },
      ],
    }).compile();

    service = module.get<ProviderServiceService>(ProviderServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Example test
  // it('should return providers', async () => {
  //   prismaMock.provider.findMany.mockResolvedValue([]);
  //   const result = await service.findAll();
  //   expect(result).toEqual([]);
  // });
});
