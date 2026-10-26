import { Module } from '@nestjs/common';
import { ProviderNotificationController } from './provider-notification.controller';
import { ProviderCacheService } from '../provider-cache.service';

@Module({
  controllers: [ProviderNotificationController],
  providers: [ProviderCacheService],
})
export class ProviderNotificationModule {}
