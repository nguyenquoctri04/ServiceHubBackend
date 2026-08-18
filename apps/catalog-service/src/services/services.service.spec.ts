// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ServicesService } from './services.service';
import { LocationService } from '../location/location.service';
import { PrismaService } from '../prisma/prisma.service';
import { SecureRpcService } from '@app/common';
import { ServiceType, CalculationMethod, BillingFrequency, BillingIntervalUnit } from './dto/create-service.dto';

describe('ServicesService', () => {
  let service: ServicesService;
  let prismaService: any;
  let locationService: any;
  let identityClient: any;
  let secureRpc: any;
  let configService: any;

  beforeEach(async () => {
    prismaService = {
      $transaction: jest.fn((cb) => cb(prismaService)),
      service: {
        create: jest.fn().mockResolvedValue({ id: 'service-1' }),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      },
      roomType: { findFirst: jest.fn() },
      serviceRequirement: { createMany: jest.fn(), deleteMany: jest.fn() },
      servicePrice: {
        create: jest.fn(),
      },
      serviceBillingRule: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rule-1' }),
        create: jest.fn().mockResolvedValue({ id: 'rule-1' }),
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

    secureRpc = {
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
        { provide: SecureRpcService, useValue: secureRpc },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('chỉ trả về danh mục từ nguồn dữ liệu thật theo thứ tự tên', async () => {
    prismaService.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Điện' }]);

    await expect(service.findCategories()).resolves.toEqual([{ id: 'cat-1', name: 'Điện' }]);
    expect(prismaService.category.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  });

  it('không cho cập nhật dịch vụ không thuộc provider đang hoạt động', async () => {
    prismaService.service.findFirst.mockResolvedValue(null);

    await expect(service.updateService('provider-1', 'service-1', { name: 'Tên mới' }))
      .rejects.toThrow(RpcException);
    expect(prismaService.service.update).not.toHaveBeenCalled();
  });

  it('tìm chi tiết dịch vụ bằng điều kiện id và providerId', async () => {
    prismaService.service.findFirst.mockResolvedValue(null);

    await expect(service.findOneService('provider-1', 'service-1')).rejects.toThrow(RpcException);
    expect(prismaService.service.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'service-1', providerId: 'provider-1' },
    }));
  });

  it('Nhánh 1: Loại PROPERTY_MANAGER -> Không chạy logic tính khoảng cách', async () => {
    secureRpc.send.mockResolvedValue({ providerType: 'PROPERTY_MANAGER' });
    
    await service.createService('provider-1', {
      name: 'Test',
      categoryId: 'cat-1',
      address: '123 Test St',
      serviceType: ServiceType.NORMAL,
      billingRule: {
        calculationMethod: CalculationMethod.FIXED,
        billingFrequency: BillingFrequency.ONE_TIME,
        billingIntervalUnit: BillingIntervalUnit.MONTH,
      },
      prices: [],
    });

    expect(locationService.geocode).not.toHaveBeenCalled();
    expect(prismaService.service.create).toHaveBeenCalled();
  });

  it('Nhánh 2: EXTERNAL_SERVICE xa Property > 5km chưa confirm -> throw HTTP 400', async () => {
    secureRpc.send.mockResolvedValue({ providerType: 'EXTERNAL_SERVICE' });
    locationService.geocode.mockResolvedValue({ lat: 10, lng: 10 });
    // Mock getNearestProperty returns a property
    prismaService.$queryRaw.mockResolvedValueOnce([{ id: 'prop-1', propertyName: 'Test Prop', latitude: 11, longitude: 11 }]);
    locationService.getDistanceKm.mockResolvedValue(10); // > 5km

    await expect(
      service.createService('provider-1', {
        name: 'Test',
        categoryId: 'cat-1',
        address: '123 Test St',
        serviceType: ServiceType.NORMAL,
        billingRule: {
          calculationMethod: CalculationMethod.FIXED,
          billingFrequency: BillingFrequency.ONE_TIME,
          billingIntervalUnit: BillingIntervalUnit.MONTH,
        },
        prices: [],
      })
    ).rejects.toThrow(RpcException);
  });

  it('Nhánh 3: EXTERNAL_SERVICE xa Service khác > 5km (do không có Property) -> throw HTTP 400', async () => {
    secureRpc.send.mockResolvedValue({ providerType: 'EXTERNAL_SERVICE' });
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
        serviceType: ServiceType.NORMAL,
        billingRule: {
          calculationMethod: CalculationMethod.FIXED,
          billingFrequency: BillingFrequency.ONE_TIME,
          billingIntervalUnit: BillingIntervalUnit.MONTH,
        },
        prices: [],
      })
    ).rejects.toThrow(RpcException);
  });

  it('Nhánh 4: Không có Property, Không có Service -> Pass luôn', async () => {
    secureRpc.send.mockResolvedValue({ providerType: 'EXTERNAL_SERVICE' });
    locationService.geocode.mockResolvedValue({ lat: 10, lng: 10 });
    // Mock getNearestProperty returns empty
    prismaService.$queryRaw.mockResolvedValueOnce([]);
    // Mock getNearestService returns empty
    prismaService.$queryRaw.mockResolvedValueOnce([]);

    await service.createService('provider-1', {
      name: 'Test',
      categoryId: 'cat-1',
      address: '123 Test St',
      serviceType: ServiceType.NORMAL,
      billingRule: {
        calculationMethod: CalculationMethod.FIXED,
        billingFrequency: BillingFrequency.ONE_TIME,
        billingIntervalUnit: BillingIntervalUnit.MONTH,
      },
      prices: [],
    });

    expect(prismaService.service.create).toHaveBeenCalled();
  });

  it('Nhánh 5: External API bị timeout -> Ném lỗi 400 (Không còn Fail-open nữa)', async () => {
    // Giả lập Identity Service timeout
    secureRpc.send.mockRejectedValue(new Error('Timeout'));
    
    await expect(
      service.createService('provider-1', {
        name: 'Test',
        categoryId: 'cat-1',
        address: '123 Test St',
        serviceType: ServiceType.NORMAL,
        billingRule: {
          calculationMethod: CalculationMethod.FIXED,
          billingFrequency: BillingFrequency.ONE_TIME,
          billingIntervalUnit: BillingIntervalUnit.MONTH,
        },
        prices: [],
      })
    ).rejects.toThrow(RpcException);
  });
});
