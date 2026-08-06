import { Controller } from '@nestjs/common';
import { SignaturesService } from './signatures.service';

@Controller()
export class SignaturesController {
  constructor(private readonly service: SignaturesService) {}
}
