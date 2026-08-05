import { Controller } from '@nestjs/common';
import { ProvidersService } from './providers.service';

@Controller()
export class ProvidersController {
  constructor(private readonly service: ProvidersService) {}
}
