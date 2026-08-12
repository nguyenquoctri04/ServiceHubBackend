import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CategoriesModule } from './categories/categories.module';
import { UnitsModule } from './units/units.module';
import { ServicesModule } from './services/services.module';
import { LocationModule } from './location/location.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    PrismaModule,
    CategoriesModule,
    UnitsModule,
    ServicesModule,
    LocationModule
  ],
  controllers: [],
  providers: [],
})
export class CatalogServiceModule {}
