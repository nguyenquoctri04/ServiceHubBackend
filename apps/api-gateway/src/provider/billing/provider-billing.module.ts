import { Module } from '@nestjs/common';
import { ProviderBillingController } from './provider-billing.controller';
import { ProviderBillingBffService } from './provider-billing-bff.service';
import { ProviderCacheService } from '../provider-cache.service';

@Module({
  controllers: [ProviderBillingController],
  providers: [ProviderBillingBffService, ProviderCacheService],
})
export class ProviderBillingModule {}
