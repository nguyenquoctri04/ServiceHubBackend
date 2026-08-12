import { Module } from '@nestjs/common';
import { CustomerCategoriesController } from './categories.controller';
import { CustomerCategoriesService } from './categories.service';

@Module({
  controllers: [CustomerCategoriesController],
  providers: [CustomerCategoriesService],
  exports: [CustomerCategoriesService],
})
export class CategoriesModule {}