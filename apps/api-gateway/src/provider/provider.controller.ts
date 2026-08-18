import {
  Body,
  Delete,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  BadRequestException,
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
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';
import { CreateContractDto, UpdateContractDto, ContractActionDto, ContractQueryDto, CreateViolationAppealDto, ViolationActionDto } from './dto/contract.dto';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { CatalogPatterns } from '@app/common/constants/catalog.patterns';
import { IdempotencyGuard } from '@app/common/guards/idempotency.guard';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto } from '@app/common/dto/billing/pay-invoice.dto';
import { CreateMeterReadingDto } from '@app/common/dto/billing/create-meter-reading.dto';
import { OcrMeterDto } from '@app/common/dto/billing/ocr-meter.dto';
import { OcrConfirmDto } from '@app/common/dto/billing/ocr-confirm.dto';
import { ExcelImportConfirmDto } from '@app/common/dto/billing/excel-import-confirm.dto';
import { MeterQueryDto, ExcelImportPreviewDto } from './dto/meter.dto';
import { ProviderCacheService } from './provider-cache.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { CreateBlockDto, CreateFloorDto, CreatePropertyDto, CreateRoomDto, CreateRoomTypeDto, UpdateBlockDto, UpdateFloorDto, UpdatePropertyDto, UpdateRoomDto, UpdateRoomTypeDto } from './dto/property.dto';

export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  providerId?: string;
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
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
    private readonly providerCache: ProviderCacheService,
  ) {}

  /**
   * Get full Provider profile including legal documents.
   * Uses send() (synchronous) - needs to wait for response from Identity Service.
   * Gateway only acts as a proxy, containing no business logic.
   */
  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.getProfile' },
      { identityId: user.id, providerId },
    );
  }

  @Get('statistics')
  async getStatistics(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const [properties, contracts, invoices, roomCount, violations, meterStats] = await Promise.allSettled([
      this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.PROPERTIES_FIND_BY_PROVIDER }, { providerId }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId, limit: 100 }),
      this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_FIND }, { providerId, query: { limit: 100 } }),
      this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOMS_COUNT_BY_PROVIDER }, { providerId }),
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
    const providerId = await this.providerCache.resolveActiveProvider(user);

    let targetPropertyId = propertyId;
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
    return this.aggregateRoomData(providerId, rooms || []);
  }

  /**
   * Update Provider profile.
   * DTO is validated at Gateway before proxying to Identity Service.
   */
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

  /**
   * Upload/Add new Legal Document.
   */
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

  // --- CATALOG MODULE ---

  /**
   * Get list of services for Provider
   */
  @Get('catalog/services')
  async getServices(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ServiceQueryDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.find' },
      { providerId, ...query },
    );
  }

  @Get('catalog/service-categories')
  async getServiceCategories(@CurrentUser() user: CurrentUserPayload) {
    await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: 'services.categories.find' }, {});
  }

  /**
   * Get details of a specific service
   */
  @Get('catalog/services/:id')
  async getServiceDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') serviceId: string,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
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
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.create' },
      { providerId, dto },
    );
  }

  @Put('catalog/services/:id')
  async updateService(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.update' },
      { providerId, serviceId, dto },
    );
  }

  @Get('catalog/properties')
  async getProperties(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.PROPERTIES_FIND_BY_PROVIDER }, { providerId });
  }

  @Post('catalog/properties')
  async createProperty(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePropertyDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.PROPERTY_CREATE },
      { providerId, dto },
    );
  }

  @Get('catalog/properties/:id')
  async getPropertyById(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.PROPERTY_FIND_BY_ID },
      { providerId, propertyId },
    );
  }

  @Put('catalog/properties/:id')
  async updateProperty(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string, @Body() dto: UpdatePropertyDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.PROPERTY_UPDATE }, { providerId, propertyId, dto });
  }

  @Delete('catalog/properties/:id')
  async deleteProperty(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.PROPERTY_DELETE }, { providerId, propertyId });
  }

  @Post('catalog/properties/:id/blocks')
  async createBlock(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') propertyId: string,
    @Body() dto: CreateBlockDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.BLOCK_CREATE },
      { providerId, propertyId, dto },
    );
  }

  @Delete('catalog/blocks/:id')
  async deleteBlock(@CurrentUser() user: CurrentUserPayload, @Param('id') blockId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.BLOCK_DELETE }, { providerId, blockId });
  }

  @Put('catalog/blocks/:id')
  async updateBlock(@CurrentUser() user: CurrentUserPayload, @Param('id') blockId: string, @Body() dto: UpdateBlockDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.BLOCK_UPDATE }, { providerId, blockId, dto });
  }

  @Post('catalog/blocks/:id/floors')
  async createFloor(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') blockId: string,
    @Body() dto: CreateFloorDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.FLOOR_CREATE },
      { providerId, blockId, dto },
    );
  }

  @Put('catalog/floors/:id')
  async updateFloor(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') floorId: string,
    @Body() dto: UpdateFloorDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.FLOOR_UPDATE }, { providerId, floorId, dto });
  }

  @Delete('catalog/floors/:id')
  async deleteFloor(@CurrentUser() user: CurrentUserPayload, @Param('id') floorId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.FLOOR_DELETE }, { providerId, floorId });
  }

  @Post('catalog/properties/:id/room-types')
  async createRoomType(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') propertyId: string,
    @Body() dto: CreateRoomTypeDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOM_TYPE_CREATE },
      { providerId, propertyId, dto },
    );
  }

  @Put('catalog/room-types/:id')
  async updateRoomType(@CurrentUser() user: CurrentUserPayload, @Param('id') roomTypeId: string, @Body() dto: UpdateRoomTypeDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOM_TYPE_UPDATE }, { providerId, roomTypeId, dto });
  }

  @Delete('catalog/room-types/:id')
  async deleteRoomType(@CurrentUser() user: CurrentUserPayload, @Param('id') roomTypeId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOM_TYPE_DELETE }, { providerId, roomTypeId });
  }

  @Post('catalog/rooms')
  async createRoom(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateRoomDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOM_CREATE }, { providerId, dto });
  }

  @Put('catalog/rooms/:id')
  async updateRoom(@CurrentUser() user: CurrentUserPayload, @Param('id') roomId: string, @Body() dto: UpdateRoomDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOM_UPDATE }, { providerId, roomId, dto });
  }

  @Get('catalog/rooms')
  async getRoomsForProvider(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const rooms = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOMS_FIND_BY_PROVIDER },
      { providerId },
    );
    return this.aggregateRoomData(providerId, rooms || []);
  }

  @Get('catalog/properties/:id/rooms')
  async getRoomsByProperty(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const rooms = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOMS_FIND_BY_PROPERTY },
      { providerId, propertyId },
    );
    return this.aggregateRoomData(providerId, rooms || []);
  }

  @Get('catalog/properties/:id/blocks')
  async getBlocksByProperty(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.BLOCKS_FIND_BY_PROPERTY },
      { providerId, propertyId },
    );
  }

  @Get('catalog/properties/:id/room-types')
  async getRoomTypesByProperty(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOM_TYPES_FIND_BY_PROPERTY },
      { providerId, propertyId },
    );
  }

  @Get('catalog/blocks/:id/floors')
  async getFloorsByBlock(@CurrentUser() user: CurrentUserPayload, @Param('id') blockId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.FLOORS_FIND_BY_BLOCK },
      { providerId, blockId },
    );
  }

  @Get('catalog/floors/:id/rooms')
  async getRoomsByFloor(@CurrentUser() user: CurrentUserPayload, @Param('id') floorId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const rooms = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOMS_FIND_BY_FLOOR },
      { providerId, floorId },
    );
    return this.aggregateRoomData(providerId, rooms || []);
  }

  private async aggregateRoomData(providerId: string, rooms: any[]) {
    if (!rooms || rooms.length === 0) return [];

    const [contracts, invoicesRes, violations] = await Promise.all([
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId, limit: 1000 }),
      this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_FIND }, { providerId, query: { limit: 1000 } }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.VIOLATIONS_FIND }, { providerId })
    ]);

    const invoices = invoicesRes?.data || [];

    return rooms.map((room: any) => {
      const activeContract = contracts?.find((c: any) => c.roomId === room.id && c.status === 'ACTIVE');

      let rentStatus = 'EMPTY';
      let debtAmount = 0;
      let issueCount = 0;

      if (activeContract) {
        rentStatus = 'RENTED';

        const contractViolations = violations?.filter((v: any) => v.contractId === activeContract.id && v.status === 'REPORTED');
        issueCount = contractViolations?.length || 0;

        const contractInvoices = invoices.filter((inv: any) => inv.contractId === activeContract.id && (inv.status === 'UNPAID' || inv.status === 'OVERDUE'));
        const hasDebt = contractInvoices && contractInvoices.length > 0;
        debtAmount = hasDebt ? contractInvoices.reduce((acc: number, inv: any) => acc + Number(inv.total), 0) : 0;

        if (issueCount > 0) {
          rentStatus = 'ISSUE';
        } else if (hasDebt) {
          rentStatus = 'DEBT';
        }
      }

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        roomTypeId: room.roomTypeId,
        status: room.status,
        roomType: room.roomType ? {
          id: room.roomType.id,
          typeName: room.roomType.typeName
        } : undefined,
        rentStatus,
        tenant: activeContract ? {
          id: activeContract.customerId,
          name: activeContract.customerName,
          phone: activeContract.customerPhone
        } : undefined,
        debtAmount,
        contract: activeContract ? {
          id: activeContract.id,
          contractNumber: activeContract.contractNumber,
          endDate: activeContract.endDate
        } : undefined,
        // Include floor info if present for dashboard compatibility
        floorId: room.floorId,
        floorName: room.floor?.floorName
      };
    });
  }

  // --- CONTRACT MODULE ---

  @Get('contract-templates')
  async getContractTemplates(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TEMPLATES_FIND }, { providerId });
  }

  @Get('contract-templates/:id')
  async getContractTemplateDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') templateId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TEMPLATES_FIND_ONE }, { providerId, templateId });
  }

  @Get('contract-terms')
  async getContractTerms(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TERMS_FIND }, { providerId });
  }

  @Get('contracts')
  async getContracts(@CurrentUser() user: CurrentUserPayload, @Query() query: ContractQueryDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId, ...query });
  }

  @Get('contracts/requests/:requestNumber')
  async getDraftByRequestNumber(@CurrentUser() user: CurrentUserPayload, @Param('requestNumber') contractNumber: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND_DRAFT_BY_REQUEST_NUMBER }, { providerId, contractNumber });
  }

  @Get('contracts/:id')
  async getContractById(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND_ONE }, { providerId, contractId });
  }

  @Post('contracts')
  async createContract(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateContractDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CREATE }, { providerId, dto });
  }

  @Put('contracts/:id')
  async updateContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: UpdateContractDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.UPDATE }, { providerId, contractId, dto });
  }

  @Post('contracts/:id/send')
  async sendContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.SEND }, { providerId, contractId });
  }

  @Post('contracts/:id/revoke')
  async revokeContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.REVOKE }, { providerId, contractId, dto });
  }

  @Post('contracts/:id/cancel')
  async cancelContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CANCEL }, { providerId, contractId, dto });
  }

  @Post('contracts/:id/terminate')
  async terminateContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TERMINATE }, { providerId, contractId, dto });
  }

  // --- VIOLATIONS MODULE ---

  @Get('violations')
  async getViolations(@CurrentUser() user: CurrentUserPayload, @Query('status') status?: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.VIOLATIONS_FIND }, { providerId, actorId: user.id, status });
  }

  @Post('violations/:id/appeals')
  async createAppeal(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') violationCaseId: string,
    @Body() dto: CreateViolationAppealDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.contractClient,
      { cmd: 'provider.violations.appeals.create' },
      { providerId, violationCaseId, reason: dto.reason, appellantId: user.id }
    );
  }

  // --- CUSTOMERS MODULE ---

  @Get('customers')
  async getCustomers(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CUSTOMERS_FIND }, { providerId });
  }

  @Post('customers/:id/block')
  async blockCustomer(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') customerId: string,
    @Body() dto: { reason: string }
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.contractClient, 
      { cmd: 'provider.customers.block' }, 
      { providerId, customerId, reason: dto.reason, blockBy: user.id }
    );
  }

  // --- BILLING MODULE ---

  @Get('billing/invoices')
  async getInvoices(@CurrentUser() user: CurrentUserPayload, @Query() query: InvoiceQueryDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const invoicesResp = await this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_FIND }, { providerId, query });
    const contracts = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId, limit: 1000 });
    
    if (!invoicesResp || !invoicesResp.data) return invoicesResp;

    const mappedData = invoicesResp.data.map((inv: any) => {
      const contract = contracts?.find((c: any) => c.id === inv.contractId);
      return {
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        customer_id: contract?.customerId || '',
        customer_name: contract?.customerName || 'Dịch vụ lẻ',
        contract_id: inv.contractId,
        room_name: contract?.roomName || 'Không xác định',
        billing_period_start: inv.billingPeriodStart,
        billing_period_end: inv.billingPeriodEnd,
        due_date: inv.dueDate,
        total: inv.total,
        status: inv.status,
        created_at: inv.createdAt,
        updated_at: inv.updatedAt,
        items: inv.items?.map((item: any) => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
          type: item.type
        })),
        payments: inv.payments?.map((p: any) => ({
          id: p.id,
          invoice_id: p.invoiceId,
          payment_method: p.paymentMethod,
          status: p.status,
          paid_at: p.paidAt,
          note: p.note,
          created_at: p.createdAt,
        }))
      };
    });

    return { ...invoicesResp, data: mappedData };
  }

  @Post('billing/invoices/:id/pay')
  @UseGuards(IdempotencyGuard)
  async payInvoice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') invoiceId: string,
    @Body() dto: PayInvoiceDto,
    @Headers('idempotency-key') idempotencyKey: string
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.INVOICES_PAY }, 
      { providerId, invoiceId, dto, idempotencyKey }
    );
  }

  @Get('billing/meters')
  async getMeters(@CurrentUser() user: CurrentUserPayload, @Query() query: MeterQueryDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_FIND }, { providerId, ...query });
  }

  @Get('billing/meters/grouped')
  async getGroupedMeters(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const { propertyId, month, year } = query;
    if (!propertyId) throw new BadRequestException('propertyId is required');

    // 1. Fetch rooms for property
    const rooms = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOMS_FIND_BY_PROPERTY },
      { providerId, propertyId },
    );
    // 2. Fetch active contracts for provider
    const contracts = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId, limit: 1000 });
    // 3. Fetch all meters for provider
    const metersResp = await this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_FIND }, { providerId, limit: 1000 });
    const allMeters = metersResp?.data || [];

    const occupied: any[] = [];
    const vacant: any[] = [];

    (rooms || []).forEach((room: any) => {
      const activeContract = contracts?.find((c: any) => c.roomId === room.id && c.status === 'ACTIVE');
      const roomMeters = allMeters.filter((m: any) => m.roomId === room.id);
      
      const card = {
        roomId: room.id,
        roomName: room.roomNumber,
        contractId: activeContract?.id || null,
        meters: roomMeters.map((m: any) => ({
          meter: {
            id: m.id,
            serviceId: m.serviceId || '',
            serviceName: m.serviceType === 'ELECTRICITY' ? 'Điện' : (m.serviceType === 'WATER' ? 'Nước' : m.serviceType),
            unit: m.serviceType === 'ELECTRICITY' ? 'kWh' : (m.serviceType === 'WATER' ? 'm3' : '')
          },
          currentReading: null, // Depending on requirements, we can fetch readings for month/year here
          previousReading: null,
        }))
      };

      if (activeContract) {
        occupied.push(card);
      } else {
        vacant.push(card);
      }
    });

    return { occupied, vacant };
  }

  @Post('billing/meters/readings')
  async createManualReading(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMeterReadingDto
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
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
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_OCR }, { providerId, dto });
  }

  @Post('billing/meters/ocr-confirm')
  async confirmOcr(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: OcrConfirmDto
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
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
    const providerId = await this.providerCache.resolveActiveProvider(user);
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
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_IMPORT_CONFIRM }, 
      { providerId, recordedBy: user.id, dto }
    );
  }

  // --- WORKSPACE / PROVIDER REGISTRATION ---

  /**
   * Lấy danh sách tất cả provider workspaces của user hiện tại.
   * Dùng cho workspace-switcher ở top bar.
   */
  @Get('my-providers')
  getMyProviders(@CurrentUser() user: CurrentUserPayload) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.getMyProviders' },
      { identityId: user.id },
    );
  }

  /**
   * Đăng ký một provider workspace mới cho user hiện tại.
   */
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

  // --- NOTIFICATIONS ---

  /**
   * Lấy danh sách thông báo IN_APP của user (lọc theo workspace hiện tại nếu có).
   */
  @Get('notifications')
  async getNotifications(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.notificationClient,
      { cmd: 'notifications.getUserNotifications' },
      { userId: user.id, providerId },
    );
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc.
   */
  @Put('notifications/read-all')
  async markAllNotificationsRead(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.notificationClient,
      { cmd: 'notifications.markAllRead' },
      { userId: user.id, providerId },
    );
  }

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc.
   * Kiểm tra ownership trong NotificationsService để tránh IDOR.
   */
  @Put('notifications/:id/read')
  async markNotificationRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') notificationId: string,
  ) {
    return this.proxy.send(
      this.notificationClient,
      { cmd: 'notifications.markRead' },
      { notificationId, userId: user.id },
    );
  }

  // --- VIOLATION ACTIONS ---

  /**
   * Xử lý một vi phạm: tạo action record và tuỳ chọn đóng case.
   */
  @Post('violations/:id/actions')
  async handleViolationAction(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') violationCaseId: string,
    @Body() dto: ViolationActionDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.contractClient,
      { cmd: 'provider.violations.handleAction' },
      {
        providerId,
        violationCaseId,
        actionType: dto.actionType,
        description: dto.description,
        performedBy: user.id,
        resolveViolation: dto.resolveViolation,
        createRestriction: dto.createRestriction,
      },
    );
  }
}
