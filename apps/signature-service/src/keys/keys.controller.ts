import { Controller } from '@nestjs/common';
import { KeysService } from './keys.service';

@Controller()
export class KeysController {
  constructor(private readonly service: KeysService) {}
}
