import { Controller } from '@nestjs/common';
import { PropertiesService } from './properties.service';

@Controller()
export class PropertiesController {
  constructor(private readonly service: PropertiesService) {}
}
