import { Controller } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller()
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}
}
