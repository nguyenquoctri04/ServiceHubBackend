import { Controller } from '@nestjs/common';
import { ResidentsService } from './residents.service';

@Controller()
export class ResidentsController {
  constructor(private readonly service: ResidentsService) {}
}
