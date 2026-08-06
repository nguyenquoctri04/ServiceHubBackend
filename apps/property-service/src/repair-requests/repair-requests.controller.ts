import { Controller } from '@nestjs/common';
import { RepairRequestsService } from './repair-requests.service';

@Controller()
export class RepairRequestsController {
  constructor(private readonly service: RepairRequestsService) {}
}
