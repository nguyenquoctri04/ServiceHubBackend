import { Body, Controller, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser, JwtAuthGuard, ProviderBillingPatterns, ProviderContractPatterns, ProviderIdentityPatterns, Roles, RolesGuard } from '@app/common';
import { GatewayProxyService } from '../../proxy/gateway-proxy.service';
import { ProviderCacheService } from '../provider-cache.service';
import { ProviderBffService } from '../provider-bff.service';
import { CatalogPatterns } from '@app/common/constants/catalog.patterns';
import { AuditEmitterService } from '../../shared/audit-emitter.service';
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
    private readonly auditEmitter: AuditEmitterService,
  ) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.identityClient,
      { cmd: ProviderIdentityPatterns.GET_PROFILE },
      { identityId: user.id, providerId },
    );
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.identityClient,
      { cmd: ProviderIdentityPatterns.UPDATE_PROFILE },
      { identityId: user.id, providerId, dto },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'identity-service',
      action: 'UPDATE_PROVIDER',
      entityType: 'Provider',
      entityId: providerId,
      description: 'Cập nhật hồ sơ nhà cung cấp',
    });
    return result;
  }

  @Post('legal-documents')
  async addLegalDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLegalDocumentDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.identityClient,
      { cmd: ProviderIdentityPatterns.ADD_LEGAL_DOCUMENT },
      { identityId: user.id, providerId, dto },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'identity-service',
      action: 'CREATE',
      entityType: 'LegalDocument',
      entityId: providerId,
      description: `Tải lên giấy tờ pháp lý: ${dto.documentType}`,
    });
    return result;
  }

  @Get('my-providers')
  getMyProviders(@CurrentUser() user: CurrentUserPayload) {
    return this.proxy.send(
      this.identityClient,
      { cmd: ProviderIdentityPatterns.GET_MY_PROVIDERS },
      { identityId: user.id },
    );
  }

  @Post('register')
  async registerProvider(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateProviderDto,
  ) {
    const result = await this.proxy.send(
      this.identityClient,
      { cmd: ProviderIdentityPatterns.CREATE },
      { identityId: user.id, dto },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'identity-service',
      action: 'CREATE_PROVIDER',
      entityType: 'Provider',
      entityId: (result as any)?.id,
      description: `Đăng ký workspace nhà cung cấp: ${dto.providerName}`,
    });
    return result;
  }

  @Get('statistics')
  async getStatistics(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const [properties, contractStats, invoiceStats, roomCount, violationCount, meterStats] = await Promise.allSettled([
      this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.PROPERTIES_FIND_BY_PROVIDER }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.DASHBOARD_STATS }, { providerId }),
      this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_DASHBOARD_STATS }, { providerId }),
      this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOMS_COUNT_BY_PROVIDER }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.VIOLATIONS_COUNT }, { providerId, status: 'REPORTED' }),
      this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_DASHBOARD_STATS }, { providerId }),
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
      totalMeters: meters?.totalMeters || 0,
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
      this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_REVENUE_GROWTH }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.STATUS_DISTRIBUTION }, { providerId }),
      this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_AGING }, { providerId }),
      this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_RECENT_PAYMENTS }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.RECENT }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.EXPIRING }, { providerId }),
    ]);

    const alerts = [];
    if (expiringContracts.status === 'fulfilled' && expiringContracts.value?.length > 0) {
      alerts.push({
        id: 'expiring_contracts',
        type: 'warning',
        message: `Có ${expiringContracts.value.length} hợp đồng sắp hết hạn vào tháng tới.`,
        actionText: 'Xem',
        actionUrl: '/provider/contracts',
      });
    }
    // Aggregate recent activities
    const activities = [
      ...(recentPayments.status === 'fulfilled' ? recentPayments.value : []),
      ...(recentContracts.status === 'fulfilled' ? recentContracts.value : [])
    ].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);

    return {
      revenueGrowth: revenueGrowth.status === 'fulfilled' ? revenueGrowth.value : [],
      contractDistribution: contractDistribution.status === 'fulfilled' ? contractDistribution.value : { active: 0, pending: 0, churn: 0 },
      invoiceAging: invoiceAging.status === 'fulfilled' ? invoiceAging.value : { paid: 0, unpaid: 0, overdue: 0 },
      alerts,
      activities
    };
  }

  @Get('dashboard/activities')
  async getDashboardActivities(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);

    const [recentPayments, recentContracts] = await Promise.allSettled([
      this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_RECENT_PAYMENTS }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.RECENT }, { providerId }),
    ]);

    const activities = [
      ...(recentPayments.status === 'fulfilled' && Array.isArray(recentPayments.value) ? recentPayments.value : []),
      ...(recentContracts.status === 'fulfilled' && Array.isArray(recentContracts.value) ? recentContracts.value : [])
    ].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);

    return { activities };
  }
}
