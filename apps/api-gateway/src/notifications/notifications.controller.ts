import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from "@app/common";
import { GatewayNotificationsService } from "./notifications.service";
import { CreateAdminNotificationDto } from "./dto/create-admin-notification.dto";
import { ListMyNotificationsDto } from "./dto/list-my-notifications.dto";

type CurrentUserPayload = {
  id: string;
  email: string;
  role: string;
};

@Controller("api")
@UseGuards(JwtAuthGuard)
export class GatewayNotificationsController {
  constructor(private readonly service: GatewayNotificationsService) {}

  @Post("admin/notifications")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  createAdminNotification(
    @Body() dto: CreateAdminNotificationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.createAdminNotification(dto, user);
  }

  @Get("admin/notifications")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  listAdmin(
    @Query() query: ListMyNotificationsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.listAdmin(query, user);
  }

  @Get("notifications/me")
  listMine(
    @Query() query: ListMyNotificationsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.listMine(query, user);
  }

  @Get("notifications/me/unread-count")
  unreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.service.unreadCount(user);
  }

  @Patch("notifications/me/:id/read")
  markRead(
    @Param("id") notificationId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.markRead(notificationId, user);
  }

  @Patch("notifications/me/read-all")
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.service.markAllRead(user);
  }
}
