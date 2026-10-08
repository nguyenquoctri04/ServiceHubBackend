import { Module } from '@nestjs/common';
import { ProviderCatalogController } from './provider-catalog.controller';
import { ProviderCacheService } from '../provider-cache.service';
import { ProviderBffService } from '../provider-bff.service';

@Module({
  controllers: [ProviderCatalogController],
  providers: [ProviderCacheService, ProviderBffService],
})
export class ProviderCatalogModule {}
