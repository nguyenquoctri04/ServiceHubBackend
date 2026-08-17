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
    const [properties, contracts, invoices] = await Promise.allSettled([
      this.proxy.send(this.catalogClient, { cmd: ProviderContractPatterns.PROPERTIES_FIND }, { providerId: user.id }),
      this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId: user.id, limit: 100 }),
      this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_FIND }, { providerId: user.id, query: { limit: 100 } }),
    ]);

    return {
      properties: properties.status === 'fulfilled' ? properties.value : [],
      contracts: contracts.status === 'fulfilled' ? contracts.value : [],
      invoices: invoices.status === 'fulfilled' ? invoices.value : []
    };
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
  getServices(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ServiceQueryDto,
  ) {
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.find' },
      { providerId: user.id, ...query },
    );
  }

  /**
   * Get details of a specific service
   */
  @Get('catalog/services/:id')
  getServiceDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') serviceId: string,
  ) {
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.findOne' },
      { providerId: user.id, serviceId },
    );
  }

  /**
   * Create new service with pricing
   */
  @Post('catalog/services')
  createService(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateServiceDto,
  ) {
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.create' },
      { providerId: user.id, dto },
    );
  }

  @Get('catalog/properties')
  getProperties(@CurrentUser() user: CurrentUserPayload) {
    return this.proxy.send(this.catalogClient, { cmd: ProviderContractPatterns.PROPERTIES_FIND }, { providerId: user.id });
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
  getContractTemplates(@CurrentUser() user: CurrentUserPayload) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TEMPLATES_FIND }, { providerId: user.id });
  }

  @Get('contract-templates/:id')
  getContractTemplateDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') templateId: string) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TEMPLATES_FIND_ONE }, { providerId: user.id, templateId });
  }

  @Get('contract-terms')
  getContractTerms(@CurrentUser() user: CurrentUserPayload) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TERMS_FIND }, { providerId: user.id });
  }

  @Get('contracts')
  getContracts(@CurrentUser() user: CurrentUserPayload, @Query() query: ContractQueryDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId: user.id, ...query });
  }

  @Get('contracts/:id')
  getContractById(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND_ONE }, { providerId: user.id, contractId });
  }

  @Post('contracts')
  createContract(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateContractDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CREATE }, { providerId: user.id, dto });
  }

  @Put('contracts/:id')
  updateContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: UpdateContractDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.UPDATE }, { providerId: user.id, contractId, dto });
  }

  @Post('contracts/:id/send')
  sendContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.SEND }, { providerId: user.id, contractId });
  }

  @Post('contracts/:id/revoke')
  revokeContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.REVOKE }, { providerId: user.id, contractId, dto });
  }

  @Post('contracts/:id/cancel')
  cancelContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CANCEL }, { providerId: user.id, contractId, dto });
  }

  @Post('contracts/:id/terminate')
  terminateContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TERMINATE }, { providerId: user.id, contractId, dto });
  }

  // --- VIOLATIONS MODULE ---

  @Get('violations')
  getViolations(@CurrentUser() user: CurrentUserPayload, @Query('status') status?: string) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.VIOLATIONS_FIND }, { providerId: user.id, status });
  }

  @Post('violations/:id/appeals')
  createAppeal(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') violationCaseId: string,
    @Body() dto: { reason: string }
  ) {
    return this.proxy.send(
      this.contractClient,
      { cmd: 'provider.violations.appeals.create' },
      { providerId: user.id, violationCaseId, reason: dto.reason, appellantId: user.id }
    );
  }

  // --- CUSTOMERS MODULE ---

  @Get('customers')
  getCustomers(@CurrentUser() user: CurrentUserPayload) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CUSTOMERS_FIND }, { providerId: user.id });
  }

  @Post('customers/:id/block')
  blockCustomer(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') customerId: string,
    @Body() dto: { reason: string }
  ) {
    return this.proxy.send(
      this.contractClient, 
      { cmd: 'provider.customers.block' }, 
      { providerId: user.id, customerId, reason: dto.reason, blockBy: user.id }
    );
  }

  // --- BILLING MODULE ---

  @Get('billing/invoices')
  getInvoices(@CurrentUser() user: CurrentUserPayload, @Query() query: InvoiceQueryDto) {
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_FIND }, { providerId: user.id, query });
  }

  @Post('billing/invoices/:id/pay')
  @UseGuards(IdempotencyGuard)
  payInvoice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') invoiceId: string,
    @Body() dto: PayInvoiceDto,
    @Headers('idempotency-key') idempotencyKey: string
  ) {
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.INVOICES_PAY }, 
      { providerId: user.id, invoiceId, dto, idempotencyKey }
    );
  }

  @Get('billing/meters')
  getMeters(@CurrentUser() user: CurrentUserPayload, @Query() query: MeterQueryDto) {
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_FIND }, { providerId: user.id, ...query });
  }

  @Post('billing/meters/readings')
  createManualReading(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMeterReadingDto
  ) {
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_READING_CREATE }, 
      { providerId: user.id, recordedBy: user.id, dto }
    );
  }

  @Post('billing/meters/ocr')
  processOcr(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: OcrMeterDto
  ) {
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_OCR }, { providerId: user.id, dto });
  }

  @Post('billing/meters/ocr-confirm')
  confirmOcr(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: OcrConfirmDto
  ) {
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_OCR_CONFIRM }, 
      { providerId: user.id, recordedBy: user.id, dto }
    );
  }

  @Post('billing/meters/import/preview')
  previewImport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ExcelImportPreviewDto
  ) {
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_IMPORT_PREVIEW }, 
      { providerId: user.id, rows: dto.rows }
    );
  }

  @Post('billing/meters/import/confirm')
  confirmImport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ExcelImportConfirmDto
  ) {
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_IMPORT_CONFIRM }, 
      { providerId: user.id, recordedBy: user.id, dto }
    );
  }
}
