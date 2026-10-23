import {
  Body,
  Delete,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { GatewayProxyService } from '../../proxy/gateway-proxy.service';
import { CreateServiceDto } from '../dto/create-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { ServiceQueryDto } from '../dto/service-query.dto';
import { CatalogPatterns } from '@app/common/constants/catalog.patterns';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import { ProviderCacheService } from '../provider-cache.service';
import { ProviderBffService } from '../provider-bff.service';
import {
  CreateBlockDto,
  CreateFloorDto,
  CreatePropertyDto,
  CreateRoomDto,
  CreateRoomTypeDto,
  UpdateBlockDto,
  UpdateFloorDto,
  UpdatePropertyDto,
  UpdateRoomDto,
  UpdateRoomTypeDto,
} from '../dto/property.dto';
import { CurrentUserPayload } from '../provider.controller';
import { AuditEmitterService } from '../../shared/audit-emitter.service';

@Controller('api/provider/catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
export class ProviderCatalogController {
  constructor(
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
    private readonly providerCache: ProviderCacheService,
    private readonly providerBffService: ProviderBffService,
    private readonly auditEmitter: AuditEmitterService,
  ) {}

  @Get('services')
  async getServices(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ServiceQueryDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.SERVICES_FIND },
      { providerId, ...query },
    );
  }

  @Get('service-categories')
  async getServiceCategories(@CurrentUser() user: CurrentUserPayload) {
    await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.SERVICES_CATEGORIES_FIND }, {});
  }

  @Get('services/:id')
  async getServiceDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') serviceId: string,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.SERVICES_FIND_ONE },
      { providerId, serviceId },
    );
  }

  @Post('services')
  async createService(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateServiceDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.SERVICES_CREATE },
      { providerId, dto },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'CREATE',
      entityType: 'Service',
      entityId: (result as any)?.id,
      description: `Tạo dịch vụ: ${dto.name}`,
    });
    return result;
  }

  @Put('services/:id')
  async updateService(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.SERVICES_UPDATE },
      { providerId, serviceId, dto },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'UPDATE',
      entityType: 'Service',
      entityId: serviceId,
      description: `Cập nhật dịch vụ: ${dto.name || serviceId}`,
    });
    return result;
  }

  @Get('properties')
  async getProperties(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.PROPERTIES_FIND_BY_PROVIDER }, { providerId });
  }

  @Post('properties')
  async createProperty(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePropertyDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.PROPERTY_CREATE },
      { providerId, dto },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'CREATE_PROPERTY',
      entityType: 'Property',
      entityId: (result as any)?.id,
      description: `Tạo bất động sản: ${dto.propertyName || (dto as any).name}`,
    });
    return result;
  }

  @Get('properties/:id')
  async getPropertyById(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.PROPERTY_FIND_BY_ID },
      { providerId, propertyId },
    );
  }

  @Put('properties/:id')
  async updateProperty(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string, @Body() dto: UpdatePropertyDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.PROPERTY_UPDATE }, { providerId, propertyId, dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'UPDATE_PROPERTY',
      entityType: 'Property',
      entityId: propertyId,
      description: `Cập nhật bất động sản: ${dto.propertyName || (dto as any).name || propertyId}`,
    });
    return result;
  }

  @Delete('properties/:id')
  async deleteProperty(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.PROPERTY_DELETE }, { providerId, propertyId });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'DELETE_PROPERTY',
      entityType: 'Property',
      entityId: propertyId,
      description: `Xóa bất động sản: ${propertyId}`,
    });
    return result;
  }

  @Post('properties/:id/blocks')
  async createBlock(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') propertyId: string,
    @Body() dto: CreateBlockDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.BLOCK_CREATE },
      { providerId, propertyId, dto },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'CREATE',
      entityType: 'Block',
      entityId: (result as any)?.id,
      description: `Tạo tòa nhà/khối: ${dto.blockName || (dto as any).name}`,
    });
    return result;
  }

  @Delete('blocks/:id')
  async deleteBlock(@CurrentUser() user: CurrentUserPayload, @Param('id') blockId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.BLOCK_DELETE }, { providerId, blockId });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'DELETE',
      entityType: 'Block',
      entityId: blockId,
      description: `Xóa tòa nhà/khối: ${blockId}`,
    });
    return result;
  }

  @Put('blocks/:id')
  async updateBlock(@CurrentUser() user: CurrentUserPayload, @Param('id') blockId: string, @Body() dto: UpdateBlockDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.BLOCK_UPDATE }, { providerId, blockId, dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'UPDATE',
      entityType: 'Block',
      entityId: blockId,
      description: `Cập nhật tòa nhà/khối: ${dto.blockName || (dto as any).name || blockId}`,
    });
    return result;
  }

  @Post('blocks/:id/floors')
  async createFloor(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') blockId: string,
    @Body() dto: CreateFloorDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.FLOOR_CREATE },
      { providerId, blockId, dto },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'CREATE',
      entityType: 'Floor',
      entityId: (result as any)?.id,
      description: `Tạo tầng: ${dto.floorName || (dto as any).name}`,
    });
    return result;
  }

  @Put('floors/:id')
  async updateFloor(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') floorId: string,
    @Body() dto: UpdateFloorDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.FLOOR_UPDATE }, { providerId, floorId, dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'UPDATE',
      entityType: 'Floor',
      entityId: floorId,
      description: `Cập nhật tầng: ${dto.floorName || (dto as any).name || floorId}`,
    });
    return result;
  }

  @Delete('floors/:id')
  async deleteFloor(@CurrentUser() user: CurrentUserPayload, @Param('id') floorId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.FLOOR_DELETE }, { providerId, floorId });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'DELETE',
      entityType: 'Floor',
      entityId: floorId,
      description: `Xóa tầng: ${floorId}`,
    });
    return result;
  }

  @Post('properties/:id/room-types')
  async createRoomType(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') propertyId: string,
    @Body() dto: CreateRoomTypeDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOM_TYPE_CREATE },
      { providerId, propertyId, dto },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'CREATE',
      entityType: 'RoomType',
      entityId: (result as any)?.id,
      description: `Tạo loại phòng: ${dto.typeName || (dto as any).name}`,
    });
    return result;
  }

  @Put('room-types/:id')
  async updateRoomType(@CurrentUser() user: CurrentUserPayload, @Param('id') roomTypeId: string, @Body() dto: UpdateRoomTypeDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOM_TYPE_UPDATE }, { providerId, roomTypeId, dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'UPDATE',
      entityType: 'RoomType',
      entityId: roomTypeId,
      description: `Cập nhật loại phòng: ${dto.typeName || (dto as any).name || roomTypeId}`,
    });
    return result;
  }

  @Delete('room-types/:id')
  async deleteRoomType(@CurrentUser() user: CurrentUserPayload, @Param('id') roomTypeId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOM_TYPE_DELETE }, { providerId, roomTypeId });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'DELETE',
      entityType: 'RoomType',
      entityId: roomTypeId,
      description: `Xóa loại phòng: ${roomTypeId}`,
    });
    return result;
  }

  @Post('rooms')
  async createRoom(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateRoomDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOM_CREATE }, { providerId, dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'CREATE_ROOM',
      entityType: 'Room',
      entityId: (result as any)?.id,
      description: `Tạo phòng mới: ${dto.roomNumber}`,
    });
    return result;
  }

  @Put('rooms/:id')
  async updateRoom(@CurrentUser() user: CurrentUserPayload, @Param('id') roomId: string, @Body() dto: UpdateRoomDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOM_UPDATE }, { providerId, roomId, dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'UPDATE_ROOM',
      entityType: 'Room',
      entityId: roomId,
      description: `Cập nhật phòng: ${dto.roomNumber || roomId}`,
    });
    return result;
  }

  @Delete('rooms/:id')
  async deleteRoom(@CurrentUser() user: CurrentUserPayload, @Param('id') roomId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const reference = await this.proxy.send(
      this.contractClient,
      { cmd: ProviderContractPatterns.HAS_ROOM_REFERENCES },
      { providerId, roomId },
    );
    if (reference?.hasReferences) {
      throw new BadRequestException('Không thể xóa phòng đang được hợp đồng tham chiếu.');
    }
    const result = await this.proxy.send(this.catalogClient, { cmd: CatalogPatterns.ROOM_DELETE }, { providerId, roomId });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'catalog-service',
      action: 'DELETE_ROOM',
      entityType: 'Room',
      entityId: roomId,
      description: `Xóa phòng: ${roomId}`,
    });
    return result;
  }

  @Get('rooms')
  async getRoomsForProvider(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const rooms = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOMS_FIND_BY_PROVIDER },
      { providerId },
    );
    return this.providerBffService.aggregateRoomData(providerId, rooms || []);
  }

  @Get('properties/:id/rooms')
  async getRoomsByProperty(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const rooms = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOMS_FIND_BY_PROPERTY },
      { providerId, propertyId },
    );
    return this.providerBffService.aggregateRoomData(providerId, rooms || []);
  }

  @Get('properties/:id/blocks')
  async getBlocksByProperty(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.BLOCKS_FIND_BY_PROPERTY },
      { providerId, propertyId },
    );
  }

  @Get('properties/:id/room-types')
  async getRoomTypesByProperty(@CurrentUser() user: CurrentUserPayload, @Param('id') propertyId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOM_TYPES_FIND_BY_PROPERTY },
      { providerId, propertyId },
    );
  }

  @Get('blocks/:id/floors')
  async getFloorsByBlock(@CurrentUser() user: CurrentUserPayload, @Param('id') blockId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.FLOORS_FIND_BY_BLOCK },
      { providerId, blockId },
    );
  }

  @Get('floors/:id/rooms')
  async getRoomsByFloor(@CurrentUser() user: CurrentUserPayload, @Param('id') floorId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const rooms = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOMS_FIND_BY_FLOOR },
      { providerId, floorId },
    );
    return this.providerBffService.aggregateRoomData(providerId, rooms || []);
  }
}
