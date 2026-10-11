import { Module } from '@nestjs/common';
import { ProviderContractController } from './provider-contract.controller';
import { ProviderContractBffService } from './provider-contract-bff.service';
import { ProviderCacheService } from '../provider-cache.service';

@Module({
  controllers: [ProviderContractController],
  providers: [ProviderContractBffService, ProviderCacheService],
})
export class ProviderContractModule {}
