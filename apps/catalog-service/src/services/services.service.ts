import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LocationService } from '../location/location.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { firstValueFrom, timeout } from 'rxjs';
import { Prisma } from '@prisma/client-catalog';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly configService: ConfigService,
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
  ) {}

  async createService(providerId: string, dto: CreateServiceDto) {
    this.logger.log(`Creating service for provider ${providerId}`);
    
    let isExternalService = false;
    
    // 1. Get Provider Type via RPC (Timeout 1000ms)
    try {
      const providerInfo = await firstValueFrom(
        this.identityClient.send({ cmd: 'get.provider.by.id' }, providerId).pipe(timeout(1000))
      );
      if (providerInfo && providerInfo.providerType === 'EXTERNAL_SERVICE') {
        isExternalService = true;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch provider type (fail-open): ${error.message}`);
      // Fail-open: treat as normal service to not block
    }

    let finalLat = 0;
    let finalLng = 0;

    // 2. Distance Warning Logic
    if (isExternalService && dto.address) {
      const location = await this.locationService.geocode(dto.address);
      
      if (location) {
        finalLat = location.lat;
        finalLng = location.lng;

        // Try to find the nearest ACTIVE Property
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
          // Cold-start: find nearest Service
          const nearestService = await this.getNearestService(location.lat, location.lng);
          if (nearestService) {
            targetLat = Number(nearestService.latitude);
            targetLng = Number(nearestService.longitude);
            referenceType = 'SERVICE';
            referenceName = nearestService.name;
          }
        }

        if (targetLat !== null && targetLng !== null) {
          const distanceKm = await this.locationService.getDistanceKm(
            { lat: location.lat, lng: location.lng },
            { lat: targetLat, lng: targetLng }
          );

          if (distanceKm !== null) {
            const warningThreshold = parseInt(this.configService.get('EXTERNAL_SERVICE_DISTANCE_WARNING_KM') || '5', 10);
            if (distanceKm > warningThreshold && !dto.confirmDistanceWarning) {
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
      }
    }

    // 3. Save to DB using Transaction
    return this.prisma.$transaction(async (tx) => {
      const service = await tx.service.create({
        data: {
          providerId,
          name: dto.name,
          categoryId: dto.categoryId,
          description: dto.description || '',
          address: dto.address || '',
          latitude: finalLat,
          longitude: finalLng,
          status: 'ACTIVE',
          serviceType: 'NORMAL',
          requiresPrepayment: dto.requiresPrepayment ?? false,
          requiresContract: dto.requiresContract ?? false,
          roomTypeId: dto.roomTypeId,
          billingRuleId: (await this.getFallbackBillingRule(tx)).id,
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

      return service;
    });
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

  // Helpers
  private async getFallbackBillingRule(tx: any) {
    let rule = await tx.serviceBillingRule.findFirst();
    if (!rule) {
      rule = await tx.serviceBillingRule.create({
        data: {
          calculationMethod: 'FIXED',
          billingFrequency: 'ONE_TIME',
          billingIntervalUnit: 'MONTH',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
    }
    return rule;
  }
}
