import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PropertiesService } from './properties.service';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';

@Controller()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

  @MessagePattern({ cmd: ProviderBillingPatterns.CATALOG_ROOMS_BY_IDS })
  async getRoomsByIds(@Payload() roomIds: string[]) {
    return this.propertiesService.getRoomsByIds(roomIds);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.PROPERTIES_FIND })
  async getProperties(@Payload() data: { providerId: string }) {
    return this.propertiesService.getProperties(data.providerId);
  }

  @MessagePattern({ cmd: 'catalog.blocks.find' })
  async getBlocks(@Payload() data: { propertyId: string }) {
    return this.propertiesService.getBlocks(data.propertyId);
  }

  @MessagePattern({ cmd: 'catalog.floors.find' })
  async getFloors(@Payload() data: { blockId: string }) {
    return this.propertiesService.getFloors(data.blockId);
  }

  @MessagePattern({ cmd: 'catalog.rooms.find' })
  async getRooms(@Payload() data: { floorId: string }) {
    return this.propertiesService.getRooms(data.floorId);
  }

  @MessagePattern({ cmd: 'catalog.properties.findAllRooms' })
  async getAllRooms(@Payload() data: { propertyId: string }) {
    return this.propertiesService.getAllRooms(data.propertyId);
  }

  @MessagePattern({ cmd: 'catalog.rooms.count' })
  async countRooms(@Payload() data: { providerId: string }) {
    return this.propertiesService.countRooms(data.providerId);
  }
}
