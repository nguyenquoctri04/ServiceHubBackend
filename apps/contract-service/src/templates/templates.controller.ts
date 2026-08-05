import { Controller } from '@nestjs/common';
import { TemplatesService } from './templates.service';

@Controller()
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}
}
