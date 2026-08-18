import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MetersService } from './meters.service';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { CreateMeterReadingDto } from '@app/common/dto/billing/create-meter-reading.dto';
import { OcrMeterDto } from '@app/common/dto/billing/ocr-meter.dto';
import { OcrConfirmDto } from '@app/common/dto/billing/ocr-confirm.dto';
import { ExcelImportConfirmDto } from '@app/common/dto/billing/excel-import-confirm.dto';
import { ExcelRowDto } from './dto/meter.dto';

@Controller()
export class MetersController {
  constructor(private readonly service: MetersService) {}

  @MessagePattern({ cmd: ProviderBillingPatterns.METERS_FIND })
  async findMeters(@Payload() payload: { providerId: string; page?: string; limit?: string }) {
    return this.service.findMeters(payload);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.METERS_GROUPED })
  async findGroupedMeters(@Payload() payload: { providerId: string; roomIds: string[]; month: number; year: number }) {
    return this.service.findGroupedMeters(payload.providerId, payload.roomIds, payload.month, payload.year);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.METERS_READING_CREATE })
  async createManualReading(@Payload() payload: { providerId: string; recordedBy: string; dto: CreateMeterReadingDto }) {
    return this.service.createMeterReading(payload.providerId, payload.dto, payload.recordedBy, 'MANUAL');
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.METERS_OCR })
  async processOcr(@Payload() payload: { providerId: string; dto: OcrMeterDto }) {
    return this.service.processOcr(payload.dto.imgUrl);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.METERS_OCR_CONFIRM })
  async confirmOcr(@Payload() payload: { providerId: string; recordedBy: string; dto: OcrConfirmDto }) {
    return this.service.createMeterReading(payload.providerId, payload.dto, payload.recordedBy, 'IMAGE');
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.METERS_IMPORT_PREVIEW })
  async previewImport(@Payload() payload: { providerId: string; rows: ExcelRowDto[] }) {
    return this.service.previewImport(payload.providerId, payload.rows);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.METERS_IMPORT_CONFIRM })
  async confirmImport(@Payload() payload: { providerId: string; recordedBy: string; dto: ExcelImportConfirmDto }) {
    return this.service.confirmImport(payload.providerId, payload.dto.rows, payload.recordedBy);
  }

  @MessagePattern({ cmd: 'billing.meters.dashboardStats' })
  async getMeterStats(@Payload() payload: { providerId: string }) {
    return this.service.getMeterDashboardStats(payload.providerId);
  }
}
