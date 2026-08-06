import { Controller } from '@nestjs/common';
import { ContractsService } from './contracts.service';

@Controller()
export class ContractsController {
  constructor(private readonly service: ContractsService) {}
}
