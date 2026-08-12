import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@app/common';
import { GatewayProxyService } from '../proxy/gateway-proxy.service';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';

@Controller('api/provider')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
export class ProviderController {
  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
  ) {}

  /**
   * Lấy hồ sơ Provider đầy đủ kèm giấy tờ pháp lý.
   * Dùng send() (đồng bộ) – cần chờ response từ Identity Service.
   * Gateway chỉ proxy, không chứa business logic.
   */
  @Get('profile')
  getProfile(@CurrentUser() user: { id: string; email: string; role: string }) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.getProfile' },
      { identityId: user.id },
    );
  }

  /**
   * Cập nhật hồ sơ Provider.
   * DTO được validate tại Gateway trước khi proxy sang Identity Service.
   */
  @Put('profile')
  updateProfile(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Body() dto: UpdateProviderProfileDto,
  ) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.updateProfile' },
      { identityId: user.id, dto },
    );
  }
}
