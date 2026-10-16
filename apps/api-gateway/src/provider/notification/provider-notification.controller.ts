import { Controller, Get, Put, Param, UseGuards, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser, JwtAuthGuard, NotificationPatterns, Roles, RolesGuard } from '@app/common';
import { GatewayProxyService } from '../../proxy/gateway-proxy.service';
import { ProviderCacheService } from '../provider-cache.service';
import { CurrentUserPayload } from '../provider.controller';

@Controller('api/provider/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
export class ProviderNotificationController {
  constructor(
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
    private readonly providerCache: ProviderCacheService,
  ) {}

  @Get()
  async getNotifications(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.notificationClient,
      { cmd: NotificationPatterns.GET_USER_NOTIFICATIONS },
      { userId: user.id, providerId },
    );
  }

  @Put('read-all')
  async markAllNotificationsRead(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.notificationClient,
      { cmd: NotificationPatterns.MARK_ALL_READ },
      { userId: user.id, providerId },
    );
  }

  @Put(':id/read')
  async markNotificationRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') notificationId: string,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.notificationClient,
      { cmd: NotificationPatterns.MARK_READ },
      { notificationId, userId: user.id, providerId },
    );
  }
}
