import { Controller } from '@nestjs/common';
import { ServicesService } from './services.service';

@Controller()
export class ServicesController {
  constructor(private readonly service: ServicesService) {}
}
