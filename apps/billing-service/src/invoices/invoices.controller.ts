import { Controller } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller()
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}
}
