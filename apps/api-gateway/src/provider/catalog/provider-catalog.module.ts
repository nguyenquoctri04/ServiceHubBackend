import { Module } from '@nestjs/common';
import { ProviderCatalogController } from './provider-catalog.controller';
import { ProviderCacheService } from '../provider-cache.service';

@Module({
  controllers: [ProviderCatalogController],
  providers: [ProviderCacheService],
})
export class ProviderCatalogModule {}
