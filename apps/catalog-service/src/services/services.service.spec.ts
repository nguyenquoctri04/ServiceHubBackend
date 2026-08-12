import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ServicesService } from './services.service';
import { LocationService } from '../location/location.service';
import { PrismaService } from '../prisma/prisma.service';
import { of, throwError } from 'rxjs';

describe('ServicesService', () => {
  let service: ServicesService;
  let prismaService: any;
  let locationService: any;
  let identityClient: any;
  let configService: any;

  beforeEach(async () => {
    prismaService = {
      $transaction: jest.fn((cb) => cb(prismaService)),
      service: {
        create: jest.fn().mockResolvedValue({ id: 'service-1' }),
      },
      servicePrice: {
        create: jest.fn(),
      },
      serviceBillingRule: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rule-1' }),
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    locationService = {
      geocode: jest.fn(),
      getDistanceKm: jest.fn(),
    };

    identityClient = {
      send: jest.fn(),
    };

    configService = {
      get: jest.fn((key) => {
        if (key === 'EXTERNAL_SERVICE_DISTANCE_WARNING_KM') return '5';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prismaService },
        { provide: LocationService, useValue: locationService },
        { provide: ConfigService, useValue: configService },
        { provide: 'IDENTITY_SERVICE', useValue: identityClient },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('Nhánh 1: Loại PROPERTY_MANAGER -> Không chạy logic tính khoảng cách', async () => {
    identityClient.send.mockReturnValue(of({ providerType: 'PROPERTY_MANAGER' }));
    
    await service.createService('provider-1', {
      name: 'Test',
      categoryId: 'cat-1',
      address: '123 Test St',
      prices: [],
    });

    expect(locationService.geocode).not.toHaveBeenCalled();
    expect(prismaService.service.create).toHaveBeenCalled();
  });

  it('Nhánh 2: EXTERNAL_SERVICE xa Property > 5km chưa confirm -> throw HTTP 400', async () => {
    identityClient.send.mockReturnValue(of({ providerType: 'EXTERNAL_SERVICE' }));
    locationService.geocode.mockResolvedValue({ lat: 10, lng: 10 });
    // Mock getNearestProperty returns a property
    prismaService.$queryRaw.mockResolvedValueOnce([{ id: 'prop-1', propertyName: 'Test Prop', latitude: 11, longitude: 11 }]);
    locationService.getDistanceKm.mockResolvedValue(10); // > 5km

    await expect(
      service.createService('provider-1', {
        name: 'Test',
        categoryId: 'cat-1',
        address: '123 Test St',
        prices: [],
      })
    ).rejects.toThrow(RpcException);
  });

  it('Nhánh 3: EXTERNAL_SERVICE xa Service khác > 5km (do không có Property) -> throw HTTP 400', async () => {
    identityClient.send.mockReturnValue(of({ providerType: 'EXTERNAL_SERVICE' }));
    locationService.geocode.mockResolvedValue({ lat: 10, lng: 10 });
    // Mock getNearestProperty returns empty
    prismaService.$queryRaw.mockResolvedValueOnce([]);
    // Mock getNearestService returns a service
    prismaService.$queryRaw.mockResolvedValueOnce([{ id: 'serv-1', name: 'Test Serv', latitude: 12, longitude: 12 }]);
    
    locationService.getDistanceKm.mockResolvedValue(8); // > 5km

    await expect(
      service.createService('provider-1', {
        name: 'Test',
        categoryId: 'cat-1',
        address: '123 Test St',
        prices: [],
      })
    ).rejects.toThrow(RpcException);
  });

  it('Nhánh 4: Không có Property, Không có Service -> Pass luôn', async () => {
    identityClient.send.mockReturnValue(of({ providerType: 'EXTERNAL_SERVICE' }));
    locationService.geocode.mockResolvedValue({ lat: 10, lng: 10 });
    // Mock getNearestProperty returns empty
    prismaService.$queryRaw.mockResolvedValueOnce([]);
    // Mock getNearestService returns empty
    prismaService.$queryRaw.mockResolvedValueOnce([]);

    await service.createService('provider-1', {
      name: 'Test',
      categoryId: 'cat-1',
      address: '123 Test St',
      prices: [],
    });

    expect(prismaService.service.create).toHaveBeenCalled();
  });

  it('Nhánh 5: External API bị timeout -> Pass (Fail-open)', async () => {
    // Giả lập Identity Service timeout
    identityClient.send.mockReturnValue(throwError(() => new Error('Timeout')));
    
    await service.createService('provider-1', {
      name: 'Test',
      categoryId: 'cat-1',
      address: '123 Test St',
      prices: [],
    });

    // Nó sẽ fallback thành non-external service và không gọi geocode
    expect(locationService.geocode).not.toHaveBeenCalled();
    expect(prismaService.service.create).toHaveBeenCalled();
  });
});
