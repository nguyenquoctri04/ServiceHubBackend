import { Controller } from '@nestjs/common';
import { UnitsService } from './units.service';

@Controller()
export class UnitsController {
  constructor(private readonly service: UnitsService) {}
}
