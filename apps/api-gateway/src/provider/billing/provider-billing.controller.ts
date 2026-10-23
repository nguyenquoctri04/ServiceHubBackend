import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { GatewayProxyService } from '../../proxy/gateway-proxy.service';
import { IdempotencyGuard } from '@app/common/guards/idempotency.guard';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { PayInvoiceDto } from '@app/common/dto/billing/pay-invoice.dto';
import { CreateMeterReadingDto } from '@app/common/dto/billing/create-meter-reading.dto';
import { OcrMeterDto } from '@app/common/dto/billing/ocr-meter.dto';
import { OcrConfirmDto } from '@app/common/dto/billing/ocr-confirm.dto';
import { ExcelImportConfirmDto } from '@app/common/dto/billing/excel-import-confirm.dto';
import { GroupedMeterQueryDto, MeterQueryDto, ExcelImportPreviewDto } from '../dto/meter.dto';
import { ProviderCacheService } from '../provider-cache.service';
import { ProviderBillingBffService } from './provider-billing-bff.service';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { CurrentUserPayload } from '../provider.controller';
import { AuditEmitterService } from '../../shared/audit-emitter.service';

@Controller('api/provider/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
export class ProviderBillingController {
  constructor(
    @Inject('BILLING_SERVICE') private readonly billingClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
    private readonly providerCache: ProviderCacheService,
    private readonly billingBffService: ProviderBillingBffService,
    private readonly auditEmitter: AuditEmitterService,
  ) {}

  @Get('invoices')
  async getInvoices(@CurrentUser() user: CurrentUserPayload, @Query() query: InvoiceQueryDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.billingBffService.getInvoices(providerId, query);
  }

  @Post('invoices/:id/pay')
  @UseGuards(IdempotencyGuard)
  async payInvoice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') invoiceId: string,
    @Body() dto: PayInvoiceDto,
    @Headers('idempotency-key') idempotencyKey: string
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.INVOICES_PAY }, 
      { providerId, invoiceId, dto, idempotencyKey }
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'billing-service',
      action: 'PAY_INVOICE',
      entityType: 'Invoice',
      entityId: invoiceId,
      description: `Xác nhận thu tiền hóa đơn (${dto.paymentMethod})`,
    });
    return result;
  }

  @Get('meters')
  async getMeters(@CurrentUser() user: CurrentUserPayload, @Query() query: MeterQueryDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_FIND }, { providerId, ...query });
  }

  @Get('meters/grouped')
  async getGroupedMeters(@CurrentUser() user: CurrentUserPayload, @Query() query: GroupedMeterQueryDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.billingBffService.getGroupedMeters(providerId, query);
  }

  @Post('meters/readings')
  async createManualReading(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMeterReadingDto
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_READING_CREATE }, 
      { providerId, recordedBy: user.id, dto }
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'billing-service',
      action: 'CREATE',
      entityType: 'MeterReading',
      entityId: dto.meterId,
      description: `Ghi chỉ số công tơ thủ công: ${dto.value}`,
    });
    return result;
  }

  @Post('meters/readings/:id/cancel')
  async cancelReading(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') readingId: string
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_READING_CANCEL }, 
      { providerId, readingId }
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'billing-service',
      action: 'DELETE',
      entityType: 'MeterReading',
      entityId: readingId,
      description: 'Hủy chỉ số công tơ',
    });
    return result;
  }

  @Post('meters/ocr')
  async processOcr(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: OcrMeterDto
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.METERS_OCR }, { providerId, dto });
  }

  @Post('meters/ocr-confirm')
  async confirmOcr(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: OcrConfirmDto
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.billingClient, 
      { cmd: ProviderBillingPatterns.METERS_OCR_CONFIRM }, 
      { providerId, recordedBy: user.id, dto }
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'billing-service',
      action: 'CREATE',
      entityType: 'MeterReading',
      entityId: dto.meterId,
      description: `Lưu chỉ số công tơ qua OCR: ${dto.value}`,
    });
    return result;
  }

  @Post('meters/import/preview')
  async previewImport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ExcelImportPreviewDto
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.billingBffService.previewImport(providerId, dto.rows);
  }

  @Post('meters/import/confirm')
  async confirmImport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ExcelImportConfirmDto
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.billingBffService.confirmImport(providerId, user.id, dto);
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'billing-service',
      action: 'CREATE',
      entityType: 'MeterReading',
      description: `Import danh sách chỉ số công tơ từ Excel (${dto.rows?.length || 0} bản ghi)`,
    });
    return result;
  }
}
