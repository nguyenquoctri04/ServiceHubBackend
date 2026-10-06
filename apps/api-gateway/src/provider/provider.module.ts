import { Module } from '@nestjs/common';
import { ProviderCacheService } from './provider-cache.service';
import { ProviderBffService } from './provider-bff.service';
import { ProviderBillingModule } from './billing/provider-billing.module';
import { ProviderCatalogModule } from './catalog/provider-catalog.module';
import { ProviderContractModule } from './contract/provider-contract.module';
import { ProviderNotificationModule } from './notification/provider-notification.module';
import { ProviderProfileModule } from './profile/provider-profile.module';

@Module({
  imports: [
    ProviderBillingModule, 
    ProviderCatalogModule, 
    ProviderContractModule, 
    ProviderNotificationModule,
    ProviderProfileModule
  ],
  providers: [ProviderCacheService, ProviderBffService],
})
export class ProviderModule {}
