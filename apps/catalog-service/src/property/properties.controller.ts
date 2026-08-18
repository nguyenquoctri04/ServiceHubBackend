import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PropertiesService } from './properties.service';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import { CatalogPatterns } from '@app/common/constants/catalog.patterns';

@Controller()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

  @MessagePattern({ cmd: CatalogPatterns.PROPERTIES_FIND_BY_PROVIDER })
  async getProperties(@Payload() data: { providerId: string }) {
    return this.propertiesService.getProperties(data.providerId);
  }

  @MessagePattern({ cmd: CatalogPatterns.PROPERTY_CREATE })
  async createProperty(
    @Payload()
    data: {
      providerId: string;
      dto: {
        propertyName: string;
        address: string;
        latitude: number;
        longitude: number;
        description?: string;
        status?: 'ACTIVE' | 'INACTIVE';
      };
    },
  ) {
    return this.propertiesService.createProperty(data.providerId, data.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.PROPERTY_UPDATE })
  async updateProperty(@Payload() data: { providerId: string; propertyId: string; dto: any }) {
    return this.propertiesService.updateProperty(data.providerId, data.propertyId, data.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.PROPERTY_DELETE })
  async deleteProperty(@Payload() data: { providerId: string; propertyId: string }) {
    return this.propertiesService.deleteProperty(data.providerId, data.propertyId);
  }

  @MessagePattern({ cmd: CatalogPatterns.BLOCK_CREATE })
  async createBlock(
    @Payload()
    data: {
      providerId: string;
      propertyId: string;
      dto: { blockName: string; status?: 'ACTIVE' | 'INACTIVE' };
    },
  ) {
    return this.propertiesService.createBlock(data.providerId, data.propertyId, data.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.BLOCK_DELETE })
  async deleteBlock(@Payload() data: { providerId: string; blockId: string }) {
    return this.propertiesService.deleteBlock(data.providerId, data.blockId);
  }

  @MessagePattern({ cmd: CatalogPatterns.BLOCK_UPDATE })
  async updateBlock(@Payload() data: { providerId: string; blockId: string; dto: any }) {
    return this.propertiesService.updateBlock(data.providerId, data.blockId, data.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.FLOOR_CREATE })
  async createFloor(
    @Payload()
    data: {
      providerId: string;
      blockId: string;
      dto: { floorName: string; status?: 'ACTIVE' | 'INACTIVE' };
    },
  ) {
    return this.propertiesService.createFloor(data.providerId, data.blockId, data.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.FLOOR_UPDATE })
  async updateFloor(@Payload() data: { providerId: string; floorId: string; dto: { floorName?: string; status?: 'ACTIVE' | 'INACTIVE' } }) {
    return this.propertiesService.updateFloor(data.providerId, data.floorId, data.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.FLOOR_DELETE })
  async deleteFloor(@Payload() data: { providerId: string; floorId: string }) {
    return this.propertiesService.deleteFloor(data.providerId, data.floorId);
  }

  @MessagePattern({ cmd: CatalogPatterns.ROOM_TYPE_CREATE })
  async createRoomType(
    @Payload()
    data: {
      providerId: string;
      propertyId: string;
      dto: {
        typeName: string;
        area: number;
        maxOccupancy: number;
        description?: string;
        status?: 'ACTIVE' | 'INACTIVE';
      };
    },
  ) {
    return this.propertiesService.createRoomType(data.providerId, data.propertyId, data.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.ROOM_TYPE_UPDATE })
  async updateRoomType(@Payload() data: { providerId: string; roomTypeId: string; dto: any }) {
    return this.propertiesService.updateRoomType(data.providerId, data.roomTypeId, data.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.ROOM_TYPE_DELETE })
  async deleteRoomType(@Payload() data: { providerId: string; roomTypeId: string }) {
    return this.propertiesService.deleteRoomType(data.providerId, data.roomTypeId);
  }

  @MessagePattern({ cmd: CatalogPatterns.ROOM_CREATE })
  async createRoom(
    @Payload()
    data: {
      providerId: string;
      dto: { floorId: string; roomTypeId: string; roomNumber: string; status?: 'ACTIVE' | 'MAINTENANCE' };
    },
  ) {
    return this.propertiesService.createRoom(data.providerId, data.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.ROOM_UPDATE })
  async updateRoom(@Payload() data: { providerId: string; roomId: string; dto: any }) {
    return this.propertiesService.updateRoom(data.providerId, data.roomId, data.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.PROPERTY_FIND_BY_ID })
  async getPropertyById(@Payload() data: { providerId: string; propertyId: string }) {
    return this.propertiesService.getPropertyById(data.providerId, data.propertyId);
  }

  @MessagePattern({ cmd: CatalogPatterns.BLOCKS_FIND_BY_PROPERTY })
  async getBlocks(@Payload() data: { providerId: string; propertyId: string }) {
    return this.propertiesService.getBlocks(data.providerId, data.propertyId);
  }

  @MessagePattern({ cmd: CatalogPatterns.FLOORS_FIND_BY_BLOCK })
  async getFloors(@Payload() data: { providerId: string; blockId: string }) {
    return this.propertiesService.getFloors(data.providerId, data.blockId);
  }

  @MessagePattern({ cmd: CatalogPatterns.ROOMS_FIND_BY_FLOOR })
  async getRooms(@Payload() data: { providerId: string; floorId: string }) {
    return this.propertiesService.getRooms(data.providerId, data.floorId);
  }

  @MessagePattern({ cmd: CatalogPatterns.ROOMS_FIND_BY_PROVIDER })
  async getRoomsForProvider(@Payload() data: { providerId: string }) {
    return this.propertiesService.getRoomsForProvider(data.providerId);
  }

  @MessagePattern({ cmd: CatalogPatterns.ROOMS_FIND_BY_PROPERTY })
  async getAllRooms(@Payload() data: { providerId: string; propertyId: string }) {
    return this.propertiesService.getAllRooms(data.providerId, data.propertyId);
  }

  @MessagePattern({ cmd: CatalogPatterns.ROOMS_FIND_BY_IDS })
  async getRoomsByIds(@Payload() roomIds: string[]) {
    return this.propertiesService.getRoomsByIds(roomIds);
  }

  @MessagePattern({ cmd: 'catalog.rooms.findByIdsForProvider' })
  async findRoomsByIdsForProvider(@Payload() payload: { providerId: string; roomIds: string[] }) {
    return this.propertiesService.findRoomsByIdsForProvider(payload.providerId, payload.roomIds);
  }

  @MessagePattern({ cmd: CatalogPatterns.ROOMS_COUNT_BY_PROVIDER })
  async countRooms(@Payload() data: { providerId: string }) {
    return this.propertiesService.countRooms(data.providerId);
  }

  @MessagePattern({
    cmd: CatalogPatterns.ROOM_TYPES_FIND_BY_PROPERTY,
  })
  async getRoomTypes(
    @Payload() data: { providerId: string; propertyId: string },
  ) {
    return this.propertiesService.getRoomTypes(data.providerId, data.propertyId);
  }
}
