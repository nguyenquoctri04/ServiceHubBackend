import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LocationService } from '../location/location.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client-catalog';
import { SecureRpcService } from '@app/common';

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
    
    // 1. Lấy thông tin Provider và kiểm tra Address
    const providerInfo = await this.validateAndGetProviderInfo(providerId);
    const isExternalService = providerInfo.providerType === 'EXTERNAL_SERVICE';
    
    const finalAddress = dto.address ?? providerInfo.address;
    if (!finalAddress) {
      throw new RpcException({ status: 400, message: 'Address is required to create a service' });
    }

    // 2. Validate khoảng cách (chỉ dành cho EXTERNAL_SERVICE)
    let finalLat = 0;
    let finalLng = 0;
    
    if (isExternalService) {
      const location = await this.validateServiceLocation(finalAddress, dto.confirmDistanceWarning ?? false);
      if (location) {
        finalLat = location.lat;
        finalLng = location.lng;
      }
    }

    // 3. Lưu vào Database (Prisma Transaction)
    return this.executeCreateServiceTransaction(providerId, dto, finalAddress, finalLat, finalLng);
  }

  // --- Private Helper Methods for Clean Code ---

  private async validateAndGetProviderInfo(providerId: string) {
    try {
      const providerInfo = await this.secureRpc.send<any>(
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

    // Tìm điểm tham chiếu gần nhất (Property hoặc Service khác)
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

    // Tính khoảng cách thực tế và cảnh báo nếu vượt ngưỡng
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
                reason: `Dịch vụ của bạn cách ${referenceType === 'PROPERTY' ? 'khu dân cư' : 'khu dịch vụ'} gần nhất ${Math.round(distanceKm * 10) / 10} km. Xác nhận để tiếp tục.`
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
            }
          });
        }
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

  async findServices(providerId: string, query: any) {
    const { page = 1, limit = 10, search, categoryId, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = {
      providerId,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(categoryId && { categoryId }),
      ...(status && { status }),
    };

    const [total, data] = await Promise.all([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          prices: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          images: {
            orderBy: { displayOrder: 'asc' },
            take: 1,
          },
        },
      }),
    ]);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      data,
    };
  }

  async findOneService(providerId: string, serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId, providerId },
      include: {
        category: true,
        billingRule: true,
        prices: {
          orderBy: { createdAt: 'desc' },
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
  private async getNearestProperty(lat: number, lng: number) {
    const properties = await this.prisma.$queryRaw<any[]>`
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
  private async getNearestService(lat: number, lng: number) {
    const services = await this.prisma.$queryRaw<any[]>`
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
