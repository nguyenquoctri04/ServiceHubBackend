import { Controller } from '@nestjs/common';
import { ViolationsService } from './violations.service';

@Controller()
export class ViolationsController {
  constructor(private readonly service: ViolationsService) {}
}
