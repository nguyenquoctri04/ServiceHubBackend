import { Module } from '@nestjs/common';
import { ProviderProfileController } from './provider-profile.controller';
import { ProviderCacheService } from '../provider-cache.service';
import { ProviderBffService } from '../provider-bff.service';

@Module({
  controllers: [ProviderProfileController],
  providers: [ProviderCacheService, ProviderBffService],
})
export class ProviderProfileModule {}
