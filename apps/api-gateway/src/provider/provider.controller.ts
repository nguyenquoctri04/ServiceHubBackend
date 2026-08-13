import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
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
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';

@Controller('api/provider')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
export class ProviderController {
  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
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

  /**
   * Tải lên/Thêm mới Giấy tờ pháp lý.
   */
  @Post('legal-documents')
  addLegalDocument(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Body() dto: CreateLegalDocumentDto,
  ) {
    return this.proxy.send(
      this.identityClient,
      { cmd: 'providers.addLegalDocument' },
      { identityId: user.id, dto },
    );
  }

  // --- CATALOG MODULE ---

  /**
   * Lấy danh sách dịch vụ của Provider
   */
  @Get('catalog/services')
  getServices(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Query() query: ServiceQueryDto,
  ) {
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.find' },
      { providerId: user.id, ...query },
    );
  }

  /**
   * Xem chi tiết một dịch vụ
   */
  @Get('catalog/services/:id')
  getServiceDetail(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Param('id') serviceId: string,
  ) {
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.findOne' },
      { providerId: user.id, serviceId },
    );
  }

  /**
   * Tạo mới dịch vụ kèm giá
   */
  @Post('catalog/services')
  createService(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Body() dto: CreateServiceDto,
  ) {
    return this.proxy.send(
      this.catalogClient,
      { cmd: 'services.create' },
      { providerId: user.id, dto },
    );
  }
}
