import { Controller } from '@nestjs/common';
import { MeterReadingsService } from './meter-readings.service';

@Controller()
export class MeterReadingsController {
  constructor(private readonly service: MeterReadingsService) {}
}
