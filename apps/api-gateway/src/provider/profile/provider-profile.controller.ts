import { Body, Controller, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { GatewayProxyService } from '../../proxy/gateway-proxy.service';
import { ProviderCacheService } from '../provider-cache.service';
import { ProviderBffService } from '../provider-bff.service';
import { CatalogPatterns } from '@app/common/constants/catalog.patterns';
import { CurrentUserPayload } from '../provider.controller';
import { UpdateProviderProfileDto } from '../dto/update-provider-profile.dto';
import { CreateLegalDocumentDto } from '../dto/create-legal-document.dto';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { DashboardRoomsQueryDto } from '../dto/meter.dto';

@Controller('api/provider')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
export class ProviderProfileController {
  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    @Inject('BILLING_SERVICE') private readonly billingClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
    private readonly providerCache: ProviderCacheService,
    private readonly providerBffService: ProviderBffService,
  ) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.getProfile' },
      { identityId: user.id, providerId },
    );
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.updateProfile' },
      { identityId: user.id, providerId, dto },
    );
  }

  @Post('legal-documents')
  async addLegalDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLegalDocumentDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.addLegalDocument' },
      { identityId: user.id, providerId, dto },
    );
  }

  @Get('my-providers')
  getMyProviders(@CurrentUser() user: CurrentUserPayload) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.getMyProviders' },
      { identityId: user.id },
    );
  }

  @Post('register')
  registerProvider(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateProviderDto,
  ) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.create' },
      { identityId: user.id, dto },
    );
  }

  @Get('statistics')
  async getStatistics(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const [properties, contractStats, invoiceStats, roomCount, violationCount, meterStats] = await Promise.allSettled([
      this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.PROPERTIES_FIND_BY_PROVIDER }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: 'contract.dashboardStats' }, { providerId }),
      this.proxy.send(this.billingClient, { cmd: 'billing.invoices.dashboardStats' }, { providerId }),
      this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOMS_COUNT_BY_PROVIDER }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: 'provider.violations.count' }, { providerId, status: 'REPORTED' }),
      this.proxy.send(this.billingClient, { cmd: 'billing.meters.dashboardStats' }, { providerId }),
    ]);

    const meters = meterStats.status === 'fulfilled' ? meterStats.value : { totalMeters: 0, recordedMeters: 0 };
    const contracts = contractStats.status === 'fulfilled' ? contractStats.value : { activeContracts: 0, pendingRequests: 0 };
    const invoices = invoiceStats.status === 'fulfilled' ? invoiceStats.value : { monthlyRevenue: 0, unpaidRevenue: 0 };

    return {
      properties: properties.status === 'fulfilled' ? properties.value : [],
      roomCount: roomCount.status === 'fulfilled' ? roomCount.value : 0,
      activeContracts: contracts.activeContracts,
      pendingRequests: contracts.pendingRequests,
      monthlyRevenue: invoices.monthlyRevenue,
      unpaidRevenue: invoices.unpaidRevenue,
      violationCount: violationCount.status === 'fulfilled' ? violationCount.value : 0,
      totalMeters: contracts.activeContracts > 0 ? contracts.activeContracts * 2 : (meters?.totalMeters || 0),
      recordedMeters: meters?.recordedMeters || 0,
    };
  }

  @Get('dashboard/rooms')
  async getDashboardRooms(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: DashboardRoomsQueryDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);

    let targetPropertyId = query.propertyId;
    if (!targetPropertyId) {
      const properties = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.PROPERTIES_FIND_BY_PROVIDER }, { providerId });
      if (!properties || properties.length === 0) {
        return [];
      }
      targetPropertyId = properties[0].id;
    }

    const rooms = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOMS_FIND_BY_PROPERTY },
      { providerId, propertyId: targetPropertyId },
    );
    return this.providerBffService.aggregateRoomData(providerId, rooms || []);
  }

  @Get('dashboard/advanced-stats')
  async getAdvancedStats(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);

    const [
      revenueGrowth,
      contractDistribution,
      invoiceAging,
      recentPayments,
      recentContracts,
      expiringContracts,
    ] = await Promise.allSettled([
      this.proxy.send(this.billingClient, { cmd: 'billing.invoices.revenueGrowth' }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: 'contract.statusDistribution' }, { providerId }),
      this.proxy.send(this.billingClient, { cmd: 'billing.invoices.aging' }, { providerId }),
      this.proxy.send(this.billingClient, { cmd: 'billing.invoices.recentPayments' }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: 'contract.recent' }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: 'contract.expiring' }, { providerId }),
    ]);

    const alerts = [];
    if (expiringContracts.status === 'fulfilled' && expiringContracts.value?.length > 0) {
      alerts.push({
        id: 'expiring_contracts',
        type: 'warning',
        message: `Có ${expiringContracts.value.length} hợp đồng sắp hết hạn vào tháng tới.`,
        actionText: 'Xem',
      });
    }
    // Aggregate recent activities
    const activities = [
      ...(recentPayments.status === 'fulfilled' ? recentPayments.value : []),
      ...(recentContracts.status === 'fulfilled' ? recentContracts.value : [])
    ].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

    return {
      revenueGrowth: revenueGrowth.status === 'fulfilled' ? revenueGrowth.value : [],
      contractDistribution: contractDistribution.status === 'fulfilled' ? contractDistribution.value : { active: 0, pending: 0, churn: 0 },
      invoiceAging: invoiceAging.status === 'fulfilled' ? invoiceAging.value : { paid: 0, unpaid: 0, overdue: 0 },
      alerts,
      activities
    };
  }
}
