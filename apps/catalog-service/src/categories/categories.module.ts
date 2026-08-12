import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CustomerCategoriesController } from './customer.categories.controller';
import { CustomerCategoriesService } from './customer.categories.service';

@Module({
  controllers: [CategoriesController, CustomerCategoriesController],
  providers: [CategoriesService, CustomerCategoriesService],
})
export class CategoriesModule {}
