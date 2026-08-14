import {
  Body,
  Controller,
  Delete,
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
   * Lấy hồ sơ Provider đầy đủ kèm giấy tờ pháp lý.
   * Dùng send() (đồng bộ) – cần chờ response từ Identity Service.
   * Gateway chỉ proxy, không chứa business logic.
   */
  @Get('profile')
  getProfile(@CurrentUser() user: { id: string; email: string; role: string }) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.getProfile' },
      { identityId: user.id },
    );
  }

  /**
   * Cập nhật hồ sơ Provider.
   * DTO được validate tại Gateway trước khi proxy sang Identity Service.
   */
  @Put('profile')
  updateProfile(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Body() dto: UpdateProviderProfileDto,
  ) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.updateProfile' },
      { identityId: user.id, dto },
    );
  }

  /**
   * Tải lên/Thêm mới Giấy tờ pháp lý.
   */
  @Post('legal-documents')
  addLegalDocument(
    @CurrentUser() user: { id: string; email: string; role: string },
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
   * Lấy danh sách dịch vụ của Provider
   */
  @Get('catalog/services')
  getServices(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Query() query: ServiceQueryDto,
  ) {
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.find' },
      { providerId: user.id, ...query },
    );
  }

  /**
   * Xem chi tiết một dịch vụ
   */
  @Get('catalog/services/:id')
  getServiceDetail(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Param('id') serviceId: string,
  ) {
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.findOne' },
      { providerId: user.id, serviceId },
    );
  }

  /**
   * Tạo mới dịch vụ kèm giá
   */
  @Post('catalog/services')
  createService(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Body() dto: CreateServiceDto,
  ) {
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.create' },
      { providerId: user.id, dto },
    );
  }

  // --- CONTRACT MODULE ---

  @Get('contract-templates')
  getContractTemplates(@CurrentUser() user: { id: string; email: string; role: string }) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TEMPLATES_FIND }, { providerId: user.id });
  }

  @Get('contract-templates/:id')
  getContractTemplateDetail(@CurrentUser() user: { id: string; email: string; role: string }, @Param('id') templateId: string) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TEMPLATES_FIND_ONE }, { providerId: user.id, templateId });
  }

  @Get('contract-terms')
  getContractTerms(@CurrentUser() user: { id: string; email: string; role: string }) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TERMS_FIND }, { providerId: user.id });
  }

  @Get('contracts')
  getContracts(@CurrentUser() user: { id: string; email: string; role: string }, @Query() query: ContractQueryDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId: user.id, ...query });
  }

  @Get('contracts/:id')
  getContractById(@CurrentUser() user: { id: string; email: string; role: string }, @Param('id') contractId: string) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND_ONE }, { providerId: user.id, contractId });
  }

  @Post('contracts')
  createContract(@CurrentUser() user: { id: string; email: string; role: string }, @Body() dto: CreateContractDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CREATE }, { providerId: user.id, dto });
  }

  @Put('contracts/:id')
  updateContract(@CurrentUser() user: { id: string; email: string; role: string }, @Param('id') contractId: string, @Body() dto: UpdateContractDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.UPDATE }, { providerId: user.id, contractId, dto });
  }

  @Post('contracts/:id/send')
  sendContract(@CurrentUser() user: { id: string; email: string; role: string }, @Param('id') contractId: string) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.SEND }, { providerId: user.id, contractId });
  }

  @Post('contracts/:id/revoke')
  revokeContract(@CurrentUser() user: { id: string; email: string; role: string }, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.REVOKE }, { providerId: user.id, contractId, dto });
  }

  @Post('contracts/:id/cancel')
  cancelContract(@CurrentUser() user: { id: string; email: string; role: string }, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CANCEL }, { providerId: user.id, contractId, dto });
  }

  @Post('contracts/:id/terminate')
  terminateContract(@CurrentUser() user: { id: string; email: string; role: string }, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TERMINATE }, { providerId: user.id, contractId, dto });
  }

  // --- BILLING MODULE ---

  @Get('billing/invoices')
  getInvoices(@CurrentUser() user: { id: string; email: string; role: string }, @Query() query: InvoiceQueryDto) {
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_FIND }, { providerId: user.id, query });
  }

  @Post('billing/invoices/:id/pay')
  @UseGuards(IdempotencyGuard)
  payInvoice(
    @CurrentUser() user: { id: string; email: string; role: string },
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
  getMeters(@CurrentUser() user: { id: string; email: string; role: string }, @Query() query: any) {
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_FIND }, { providerId: user.id, ...query });
  }

  @Post('billing/meters/readings')
  createManualReading(
    @CurrentUser() user: { id: string; email: string; role: string },
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
    @CurrentUser() user: { id: string; email: string; role: string },
    @Body() dto: OcrMeterDto
  ) {
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_OCR }, { providerId: user.id, dto });
  }

  @Post('billing/meters/ocr-confirm')
  confirmOcr(
    @CurrentUser() user: { id: string; email: string; role: string },
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
    @CurrentUser() user: { id: string; email: string; role: string },
    @Body() dto: { rows: any[] }
  ) {
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_IMPORT_PREVIEW }, 
      { providerId: user.id, rows: dto.rows }
    );
  }

  @Post('billing/meters/import/confirm')
  confirmImport(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Body() dto: ExcelImportConfirmDto
  ) {
    return this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_IMPORT_CONFIRM }, 
      { providerId: user.id, recordedBy: user.id, dto }
    );
  }
}
