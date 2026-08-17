import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@app/common';
import { GatewayProxyService } from '../proxy/gateway-proxy.service';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';
import { CreateContractDto, UpdateContractDto, ContractActionDto, ContractQueryDto } from './dto/contract.dto';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { IdempotencyGuard } from '@app/common/guards/idempotency.guard';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto } from '@app/common/dto/billing/pay-invoice.dto';
import { CreateMeterReadingDto } from '@app/common/dto/billing/create-meter-reading.dto';
import { OcrMeterDto } from '@app/common/dto/billing/ocr-meter.dto';
import { OcrConfirmDto } from '@app/common/dto/billing/ocr-confirm.dto';
import { ExcelImportConfirmDto } from '@app/common/dto/billing/excel-import-confirm.dto';
import { MeterQueryDto, ExcelImportPreviewDto } from './dto/meter.dto';
import { ProviderCacheService } from './provider-cache.service';

export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
}

@Controller('api/provider')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
export class ProviderController {
  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    @Inject('BILLING_SERVICE') private readonly billingClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
    private readonly providerCache: ProviderCacheService,
  ) {}

  /**
   * Get full Provider profile including legal documents.
   * Uses send() (synchronous) - needs to wait for response from Identity Service.
   * Gateway only acts as a proxy, containing no business logic.
   */
  @Get('profile')
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.getProfile' },
      { identityId: user.id },
    );
  }

  @Get('statistics')
  async getStatistics(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    const [properties, contracts, invoices, roomCount, violations, meterStats] = await Promise.allSettled([
      this.proxy.send(this.catalogClient, { cmd: ProviderContractPatterns.PROPERTIES_FIND }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId, limit: 100 }),
      this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_FIND }, { providerId, query: { limit: 100 } }),
      this.proxy.send(this.catalogClient, { cmd: 'catalog.rooms.count' }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.VIOLATIONS_FIND }, { providerId }),
      this.proxy.send(this.billingClient, { cmd: 'billing.meters.dashboardStats' }, { providerId }),
    ]);

    const meters = meterStats.status === 'fulfilled' ? meterStats.value : { totalMeters: 0, recordedMeters: 0 };

    return {
      properties: properties.status === 'fulfilled' ? properties.value : [],
      contracts: contracts.status === 'fulfilled' ? contracts.value : [],
      invoices: invoices.status === 'fulfilled' ? invoices.value : { data: [], total: 0 },
      roomCount: roomCount.status === 'fulfilled' ? roomCount.value : 0,
      violationCount: violations.status === 'fulfilled' ? (violations.value as any[]).filter(v => v.status === 'REPORTED').length : 0,
      totalMeters: meters?.totalMeters || 0,
      recordedMeters: meters?.recordedMeters || 0,
    };
  }

  @Get('dashboard/rooms')
  async getDashboardRooms(
    @CurrentUser() user: CurrentUserPayload,
    @Query('propertyId') propertyId?: string
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);

    let targetPropertyId = propertyId;
    if (!targetPropertyId) {
      const properties = await this.proxy.send(this.catalogClient, { cmd: ProviderContractPatterns.PROPERTIES_FIND }, { providerId });
      if (!properties || properties.length === 0) {
        return [];
      }
      targetPropertyId = properties[0].id;
    }

    const rooms = await this.proxy.send(this.catalogClient, { cmd: 'catalog.properties.findAllRooms' }, { propertyId: targetPropertyId });
    const contracts = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId, limit: 1000 });
    const invoices = await this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_FIND }, { providerId, query: { limit: 1000 } });
    const violations = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.VIOLATIONS_FIND }, { providerId });

    const result = (rooms || []).map((room: any) => {
      const activeContract = contracts?.find((c: any) => c.roomId === room.id && c.status === 'ACTIVE');
      
      if (!activeContract) {
        return {
          id: room.id,
          roomNumber: room.roomNumber,
          status: 'EMPTY',
          floorId: room.floorId,
          floorName: room.floor?.floorName
        };
      }

      const contractViolations = violations?.filter((v: any) => v.contractId === activeContract.id && v.status === 'REPORTED');
      const hasViolation = contractViolations && contractViolations.length > 0;

      const contractInvoices = invoices?.data?.filter((inv: any) => inv.contractId === activeContract.id && (inv.status === 'UNPAID' || inv.status === 'OVERDUE'));
      const hasDebt = contractInvoices && contractInvoices.length > 0;
      const debtAmount = hasDebt ? contractInvoices.reduce((acc: number, inv: any) => acc + Number(inv.total), 0) : 0;

      let status = 'PAID';
      if (hasViolation) {
        status = 'ISSUE';
      } else if (hasDebt) {
        status = 'DEBT';
      }

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        status,
        tenantName: activeContract.customerName,
        debtAmount,
        issueCount: contractViolations?.length || 0,
        floorId: room.floorId,
        floorName: room.floor?.floorName
      };
    });

    return result;
  }

  /**
   * Update Provider profile.
   * DTO is validated at Gateway before proxying to Identity Service.
   */
  @Put('profile')
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.updateProfile' },
      { identityId: user.id, dto },
    );
  }

  /**
   * Upload/Add new Legal Document.
   */
  @Post('legal-documents')
  addLegalDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLegalDocumentDto,
  ) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.addLegalDocument' },
      { identityId: user.id, dto },
    );
  }

  // --- CATALOG MODULE ---

  /**
   * Get list of services for Provider
   */
  @Get('catalog/services')
  async getServices(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ServiceQueryDto,
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.find' },
      { providerId, ...query },
    );
  }

  /**
   * Get details of a specific service
   */
  @Get('catalog/services/:id')
  async getServiceDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') serviceId: string,
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.findOne' },
      { providerId, serviceId },
    );
  }

  /**
   * Create new service with pricing
   */
  @Post('catalog/services')
  async createService(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateServiceDto,
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.create' },
      { providerId, dto },
    );
  }

  @Get('catalog/properties')
  async getProperties(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.catalogClient, { cmd: ProviderContractPatterns.PROPERTIES_FIND }, { providerId });
  }

  @Get('catalog/properties/:id/blocks')
  getBlocksByProperty(@Param('id') propertyId: string) {
    return this.proxy.send(this.catalogClient, { cmd: 'catalog.blocks.find' }, { propertyId });
  }

  @Get('catalog/blocks/:id/floors')
  getFloorsByBlock(@Param('id') blockId: string) {
    return this.proxy.send(this.catalogClient, { cmd: 'catalog.floors.find' }, { blockId });
  }

  @Get('catalog/floors/:id/rooms')
  getRoomsByFloor(@Param('id') floorId: string) {
    return this.proxy.send(this.catalogClient, { cmd: 'catalog.rooms.find' }, { floorId });
  }

  // --- CONTRACT MODULE ---

  @Get('contract-templates')
  async getContractTemplates(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TEMPLATES_FIND }, { providerId });
  }

  @Get('contract-templates/:id')
  async getContractTemplateDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') templateId: string) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TEMPLATES_FIND_ONE }, { providerId, templateId });
  }

  @Get('contract-terms')
  async getContractTerms(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TERMS_FIND }, { providerId });
  }

  @Get('contracts')
  async getContracts(@CurrentUser() user: CurrentUserPayload, @Query() query: ContractQueryDto) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId, ...query });
  }

  @Get('contracts/:id')
  async getContractById(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND_ONE }, { providerId, contractId });
  }

  @Post('contracts')
  async createContract(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateContractDto) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CREATE }, { providerId, dto });
  }

  @Put('contracts/:id')
  async updateContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: UpdateContractDto) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.UPDATE }, { providerId, contractId, dto });
  }

  @Post('contracts/:id/send')
  async sendContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.SEND }, { providerId, contractId });
  }

  @Post('contracts/:id/revoke')
  async revokeContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.REVOKE }, { providerId, contractId, dto });
  }

  @Post('contracts/:id/cancel')
  async cancelContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CANCEL }, { providerId, contractId, dto });
  }

  @Post('contracts/:id/terminate')
  async terminateContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TERMINATE }, { providerId, contractId, dto });
  }

  // --- VIOLATIONS MODULE ---

  @Get('violations')
  async getViolations(@CurrentUser() user: CurrentUserPayload, @Query('status') status?: string) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.VIOLATIONS_FIND }, { providerId, status });
  }

  @Post('violations/:id/appeals')
  async createAppeal(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') violationCaseId: string,
    @Body() dto: { reason: string }
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(
      this.contractClient,
      { cmd: 'provider.violations.appeals.create' },
      { providerId, violationCaseId, reason: dto.reason, appellantId: user.id }
    );
  }

  // --- CUSTOMERS MODULE ---

  @Get('customers')
  async getCustomers(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CUSTOMERS_FIND }, { providerId });
  }

  @Post('customers/:id/block')
  async blockCustomer(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') customerId: string,
    @Body() dto: { reason: string }
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(
      this.contractClient, 
      { cmd: 'provider.customers.block' }, 
      { providerId, customerId, reason: dto.reason, blockBy: user.id }
    );
  }

  // --- BILLING MODULE ---

  @Get('billing/invoices')
  async getInvoices(@CurrentUser() user: CurrentUserPayload, @Query() query: InvoiceQueryDto) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_FIND }, { providerId, query });
  }

  @Post('billing/invoices/:id/pay')
  @UseGuards(IdempotencyGuard)
  async payInvoice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') invoiceId: string,
    @Body() dto: PayInvoiceDto,
    @Headers('idempotency-key') idempotencyKey: string
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.INVOICES_PAY }, 
      { providerId, invoiceId, dto, idempotencyKey }
    );
  }

  @Get('billing/meters')
  async getMeters(@CurrentUser() user: CurrentUserPayload, @Query() query: MeterQueryDto) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_FIND }, { providerId, ...query });
  }

  @Post('billing/meters/readings')
  async createManualReading(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMeterReadingDto
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_READING_CREATE }, 
      { providerId, recordedBy: user.id, dto }
    );
  }

  @Post('billing/meters/ocr')
  async processOcr(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: OcrMeterDto
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_OCR }, { providerId, dto });
  }

  @Post('billing/meters/ocr-confirm')
  async confirmOcr(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: OcrConfirmDto
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_OCR_CONFIRM }, 
      { providerId, recordedBy: user.id, dto }
    );
  }

  @Post('billing/meters/import/preview')
  async previewImport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ExcelImportPreviewDto
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_IMPORT_PREVIEW }, 
      { providerId, rows: dto.rows }
    );
  }

  @Post('billing/meters/import/confirm')
  async confirmImport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ExcelImportConfirmDto
  ) {
    const providerId = await this.providerCache.resolveProviderId(user.id);
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_IMPORT_CONFIRM }, 
      { providerId, recordedBy: user.id, dto }
    );
  }
}
