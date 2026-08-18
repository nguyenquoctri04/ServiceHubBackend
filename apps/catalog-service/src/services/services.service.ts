import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LocationService } from '../location/location.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Prisma } from '@prisma/client-catalog';
import { SecureRpcService } from '@app/common';
import { ServiceQueryDto } from './dto/service-query.dto';

export interface ProviderInfo {
  id: string;
  providerType: string;
  address?: string;
}

export interface NearestPropertyResult {
  id: string;
  propertyName: string;
  latitude: number;
  longitude: number;
  distance: number;
}

export interface NearestServiceResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
}

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly configService: ConfigService,
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
  ) {}

  async createService(providerId: string, dto: CreateServiceDto) {
    this.logger.log(`Creating service for provider ${providerId}`);
    
    // 1. Get Provider info and check Address
    const providerInfo = await this.validateAndGetProviderInfo(providerId);
    const isExternalService = providerInfo.providerType === 'EXTERNAL_SERVICE';
    
    const finalAddress = dto.address ?? providerInfo.address;
    if (!finalAddress) {
      throw new RpcException({ status: 400, message: 'Address is required to create a service' });
    }

    // 2. Validate distance (only for EXTERNAL_SERVICE)
    let finalLat = 0;
    let finalLng = 0;
    
    if (isExternalService) {
      const location = await this.validateServiceLocation(finalAddress, dto.confirmDistanceWarning ?? false);
      if (location) {
        finalLat = location.lat;
        finalLng = location.lng;
      }
    }

    // 3. Save to Database (Prisma Transaction)
    return this.executeCreateServiceTransaction(providerId, dto, finalAddress, finalLat, finalLng);
  }

  async findCategories() {
    return this.prisma.category.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }

  async findServicePricesForProvider(providerId: string, priceIds: string[]) {
    return this.prisma.servicePrice.findMany({
      where: { id: { in: priceIds }, service: { providerId } },
      select: { id: true, price: true, service: { select: { name: true } } },
    });
  }

  // --- Private Helper Methods for Clean Code ---

  private async validateAndGetProviderInfo(providerId: string): Promise<ProviderInfo> {
    try {
      const providerInfo = await this.secureRpc.send<ProviderInfo>(
        this.identityClient,
        { cmd: 'get.provider.by.id' },
        providerId
      );
      return providerInfo;
    } catch (err: any) {
      this.logger.error(`Failed to fetch provider info: ${err.message}`);
      throw new RpcException({ status: 400, message: 'Provider not found or Identity Service unavailable' });
    }
  }

  private async validateServiceLocation(address: string, confirmWarning: boolean) {
    const location = await this.locationService.geocode(address);
    if (!location) return null;

    // Find the nearest reference point (Property or another Service)
    const nearestProperty = await this.getNearestProperty(location.lat, location.lng);
    let targetLat: number | null = null;
    let targetLng: number | null = null;
    let referenceType = '';
    let referenceName = '';

    if (nearestProperty) {
      targetLat = Number(nearestProperty.latitude);
      targetLng = Number(nearestProperty.longitude);
      referenceType = 'PROPERTY';
      referenceName = nearestProperty.propertyName;
    } else {
      const nearestService = await this.getNearestService(location.lat, location.lng);
      if (nearestService) {
        targetLat = Number(nearestService.latitude);
        targetLng = Number(nearestService.longitude);
        referenceType = 'SERVICE';
        referenceName = nearestService.name;
      }
    }

    // Calculate actual distance and warn if it exceeds the threshold
    if (targetLat !== null && targetLng !== null) {
      const distanceKm = await this.locationService.getDistanceKm(
        { lat: location.lat, lng: location.lng },
        { lat: targetLat, lng: targetLng }
      );

      if (distanceKm !== null) {
        const warningThreshold = parseInt(this.configService.get('EXTERNAL_SERVICE_DISTANCE_WARNING_KM') || '5', 10);
        if (distanceKm > warningThreshold && !confirmWarning) {
          throw new RpcException({
            status: 400,
            message: 'Distance warning triggered',
            error: {
              distance_check: {
                warning: true,
                distanceKm: Math.round(distanceKm * 10) / 10,
                referenceType,
                referenceName,
                reason: `Your service is ${Math.round(distanceKm * 10) / 10} km away from the nearest ${referenceType === 'PROPERTY' ? 'residential area' : 'service area'}. Confirm to continue.`
              }
            }
          });
        }
      }
    }

    return location;
  }

  private async executeCreateServiceTransaction(
    providerId: string, 
    dto: CreateServiceDto, 
    finalAddress: string, 
    finalLat: number, 
    finalLng: number
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.validateServiceReferences(tx, providerId, dto.categoryId, dto.roomTypeId, dto.requiredServiceIds);
      // Create Billing Rule from DTO
      const rule = await tx.serviceBillingRule.create({
        data: {
          calculationMethod: dto.billingRule.calculationMethod,
          billingFrequency: dto.billingRule.billingFrequency,
          billingIntervalValue: dto.billingRule.billingIntervalValue,
          billingIntervalUnit: dto.billingRule.billingIntervalUnit,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      const service = await tx.service.create({
        data: {
          providerId,
          name: dto.name,
          categoryId: dto.categoryId,
          description: dto.description || '',
          address: finalAddress,
          latitude: finalLat,
          longitude: finalLng,
          status: 'ACTIVE',
          serviceType: dto.serviceType || 'NORMAL',
          requiresPrepayment: dto.requiresPrepayment ?? false,
          requiresContract: dto.requiresContract ?? false,
          roomTypeId: dto.roomTypeId,
          billingRuleId: rule.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      if (dto.prices && dto.prices.length > 0) {
        for (const p of dto.prices) {
          await tx.servicePrice.create({
            data: {
              serviceId: service.id,
              createdBy: providerId,
              price: p.price,
              unit: p.unit,
              effectiveFrom: new Date(),
              createdAt: new Date(),
              tiers: p.tiers?.length
                ? { create: p.tiers.map((tier) => ({
                  fromValue: tier.fromValue,
                  toValue: tier.toValue ?? null,
                  price: tier.price,
                })) }
                : undefined,
            }
          });
        }
      }

      if (dto.requiredServiceIds?.length) {
        await tx.serviceRequirement.createMany({
          data: dto.requiredServiceIds.map((additionalServiceId) => ({
            serviceId: service.id,
            additionalServiceId,
            status: 'ACTIVE',
          })),
        });
      }

      if (dto.images && dto.images.length > 0) {
        for (let i = 0; i < dto.images.length; i++) {
          await tx.serviceImage.create({
            data: {
              serviceId: service.id,
              imageUrl: dto.images[i],
              displayOrder: i,
              createdAt: new Date(),
            }
          });
        }
      }

      return service;
    });
  }

  async findServices(providerId: string, query: ServiceQueryDto) {
    const pageNum = Number(query.page || 1);
    const limitNum = Number(query.limit || 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ServiceWhereInput = {
      providerId,
      ...(query.search && { name: { contains: query.search, mode: 'insensitive' } }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.status && { status: query.status as import('@prisma/client-catalog').ServiceStatus }),
    };

    const [total, data] = await Promise.all([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        skip: skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          prices: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { tiers: { orderBy: { fromValue: 'asc' } } },
          },
          billingRule: {
            select: {
              calculationMethod: true,
              billingFrequency: true,
              billingIntervalValue: true,
              billingIntervalUnit: true,
            },
          },
          requirements: { select: { additionalServiceId: true } },
          images: {
            orderBy: { displayOrder: 'asc' },
            take: 1,
          },
        },
      }),
    ]);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      data,
    };
  }

  async findOneService(providerId: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, providerId },
      include: {
        category: true,
        billingRule: true,
        prices: {
          orderBy: { createdAt: 'desc' },
          include: { tiers: { orderBy: { fromValue: 'asc' } } },
        },
        images: {
          orderBy: { displayOrder: 'asc' },
        },
        requirements: {
          include: {
            additionalService: true
          }
        },
      },
    });

    if (!service) {
      throw new RpcException({ status: 404, message: 'Service not found' });
    }

    return service;
  }

  async updateService(providerId: string, serviceId: string, dto: UpdateServiceDto) {
    const existing = await this.prisma.service.findFirst({
      where: { id: serviceId, providerId },
      select: { id: true, address: true, billingRuleId: true },
    });
    if (!existing) {
      throw new RpcException({ status: 404, message: 'Service not found' });
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    if (dto.address !== undefined && dto.address !== existing.address) {
      const providerInfo = await this.validateAndGetProviderInfo(providerId);
      if (providerInfo.providerType === 'EXTERNAL_SERVICE') {
        const location = await this.validateServiceLocation(dto.address, false);
        if (location) {
          latitude = location.lat;
          longitude = location.lng;
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await this.validateServiceReferences(tx, providerId, dto.categoryId, dto.roomTypeId, dto.requiredServiceIds, serviceId);

      if (dto.billingRule) {
        await tx.serviceBillingRule.update({
          where: { id: existing.billingRuleId },
          data: {
            ...dto.billingRule,
            billingIntervalValue: dto.billingRule.billingIntervalValue ?? 1,
            updatedAt: new Date(),
          },
        });
      }

      await tx.service.update({
        where: { id: serviceId },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.serviceType !== undefined && { serviceType: dto.serviceType }),
          ...(dto.description !== undefined && { description: dto.description.trim() || null }),
          ...(dto.address !== undefined && { address: dto.address.trim() }),
          ...(latitude !== undefined && { latitude }),
          ...(longitude !== undefined && { longitude }),
          ...(dto.roomTypeId !== undefined && { roomTypeId: dto.roomTypeId }),
          ...(dto.requiresPrepayment !== undefined && { requiresPrepayment: dto.requiresPrepayment }),
          ...(dto.requiresContract !== undefined && { requiresContract: dto.requiresContract }),
          ...(dto.status !== undefined && { status: dto.status }),
          updatedAt: new Date(),
        },
      });

      if (dto.prices?.length) {
        for (const price of dto.prices) {
          await tx.servicePrice.create({
            data: {
              serviceId,
              createdBy: providerId,
              price: price.price,
              unit: price.unit.trim(),
              effectiveFrom: new Date(),
              createdAt: new Date(),
              tiers: price.tiers?.length
                ? { create: price.tiers.map((tier) => ({
                  fromValue: tier.fromValue,
                  toValue: tier.toValue ?? null,
                  price: tier.price,
                })) }
                : undefined,
            },
          });
        }
      }

      if (dto.requiredServiceIds !== undefined) {
        await tx.serviceRequirement.deleteMany({ where: { serviceId } });
        if (dto.requiredServiceIds.length) {
          await tx.serviceRequirement.createMany({
            data: dto.requiredServiceIds.map((additionalServiceId) => ({
              serviceId,
              additionalServiceId,
              status: 'ACTIVE',
            })),
          });
        }
      }
    });

    return this.findOneService(providerId, serviceId);
  }

  private async validateServiceReferences(
    tx: Prisma.TransactionClient,
    providerId: string,
    categoryId?: string,
    roomTypeId?: string,
    requiredServiceIds?: string[],
    serviceId?: string,
  ) {
    if (categoryId) {
      const category = await tx.category.findUnique({ where: { id: categoryId }, select: { id: true } });
      if (!category) throw new RpcException({ status: 400, message: 'Danh mục dịch vụ không hợp lệ.' });
    }

    if (roomTypeId) {
      const roomType = await tx.roomType.findFirst({
        where: { id: roomTypeId, property: { providerId } },
        select: { id: true },
      });
      if (!roomType) throw new RpcException({ status: 400, message: 'Loại phòng không thuộc nhà cung cấp.' });
    }

    if (requiredServiceIds !== undefined) {
      const uniqueIds = [...new Set(requiredServiceIds)];
      if (uniqueIds.length !== requiredServiceIds.length || (serviceId && uniqueIds.includes(serviceId))) {
        throw new RpcException({ status: 400, message: 'Dịch vụ đính kèm không hợp lệ.' });
      }
      if (uniqueIds.length) {
        const matched = await tx.service.count({ where: { id: { in: uniqueIds }, providerId } });
        if (matched !== uniqueIds.length) {
          throw new RpcException({ status: 400, message: 'Dịch vụ đính kèm không thuộc nhà cung cấp.' });
        }
      }
    }
  }

  async getServiceById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });
    return service;
  }

  async getServicePriceById(id: string) {
    const price = await this.prisma.servicePrice.findUnique({
      where: { id },
      include: { service: true }
    });
    return price;
  }

  // Find nearest ACTIVE Property across entire system using Haversine
  private async getNearestProperty(lat: number, lng: number): Promise<NearestPropertyResult | null> {
    const properties = await this.prisma.$queryRaw<NearestPropertyResult[]>`
      SELECT id, property_name as "propertyName", latitude, longtitude as "longitude",
      (6371 * acos(cos(radians(${lat}::float)) * cos(radians(latitude::float)) * cos(radians(longtitude::float) - radians(${lng}::float)) + sin(radians(${lat}::float)) * sin(radians(latitude::float)))) AS distance
      FROM property
      WHERE status = 'ACTIVE'
      ORDER BY distance ASC
      LIMIT 1
    `;
    return properties.length > 0 ? properties[0] : null;
  }

  // Find nearest ACTIVE Service across entire system
  private async getNearestService(lat: number, lng: number): Promise<NearestServiceResult | null> {
    const services = await this.prisma.$queryRaw<NearestServiceResult[]>`
      SELECT id, name, latitude, longtitude as "longitude",
      (6371 * acos(cos(radians(${lat}::float)) * cos(radians(latitude::float)) * cos(radians(longtitude::float) - radians(${lng}::float)) + sin(radians(${lat}::float)) * sin(radians(latitude::float)))) AS distance
      FROM service
      WHERE status = 'ACTIVE'
      ORDER BY distance ASC
      LIMIT 1
    `;
    return services.length > 0 ? services[0] : null;
  }


}
