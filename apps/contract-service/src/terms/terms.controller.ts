import { Controller } from '@nestjs/common';
import { TermsService } from './terms.service';

@Controller()
export class TermsController {
  constructor(private readonly service: TermsService) {}
}
