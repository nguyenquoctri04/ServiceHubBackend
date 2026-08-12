import { Module } from '@nestjs/common';

import { CategoriesModule } from './categories/categories.module';
import { ServicesModule } from './services/services.module';
import { UnitsModule } from './units/units.module';

@Module({
  imports: [
    CategoriesModule,
    ServicesModule,
    UnitsModule,
  ],
})
export class CatalogModule {}