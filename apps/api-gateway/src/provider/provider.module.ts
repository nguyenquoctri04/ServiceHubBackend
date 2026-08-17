import { Module } from '@nestjs/common';
import { ProviderController } from './provider.controller';
import { ProviderCacheService } from './provider-cache.service';

@Module({
  controllers: [ProviderController],
  providers: [ProviderCacheService],
})
export class ProviderModule {}
