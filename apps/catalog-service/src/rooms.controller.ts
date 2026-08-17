import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma/prisma.service';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';

@Controller()
export class RoomsController {
  constructor(private readonly prisma: PrismaService) {}

  @MessagePattern({ cmd: ProviderBillingPatterns.CATALOG_ROOMS_BY_IDS })
  async getRoomsByIds(@Payload() roomIds: string[]) {
    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds } },
      include: {
        floor: {
          include: {
            block: {
              include: {
                property: true
              }
            }
          }
        }
      }
    });

    const roomsMap = {};
    for (const room of rooms) {
      roomsMap[room.id] = room;
    }
    return roomsMap;
  }

  @MessagePattern({ cmd: ProviderContractPatterns.PROPERTIES_FIND })
  async getProperties(@Payload() data: { providerId: string }) {
    return this.prisma.property.findMany({
      where: { providerId: data.providerId }
    });
  }

  @MessagePattern({ cmd: 'catalog.blocks.find' })
  async getBlocks(@Payload() data: { propertyId: string }) {
    return this.prisma.block.findMany({
      where: { propertyId: data.propertyId }
    });
  }

  @MessagePattern({ cmd: 'catalog.floors.find' })
  async getFloors(@Payload() data: { blockId: string }) {
    return this.prisma.floor.findMany({
      where: { blockId: data.blockId }
    });
  }

  @MessagePattern({ cmd: 'catalog.rooms.find' })
  async getRooms(@Payload() data: { floorId: string }) {
    return this.prisma.room.findMany({
      where: { floorId: data.floorId },
      include: { roomType: true }
    });
  }

  @MessagePattern({ cmd: 'catalog.properties.findAllRooms' })
  async getAllRooms(@Payload() data: { propertyId: string }) {
    return this.prisma.room.findMany({
      where: {
        floor: {
          block: {
            propertyId: data.propertyId
          }
        }
      },
      include: {
        floor: true,
        roomType: true
      }
    });
  }

  @MessagePattern({ cmd: 'catalog.rooms.count' })
  async countRooms(@Payload() data: { providerId: string }) {
    return this.prisma.room.count({
      where: {
        floor: {
          block: {
            property: {
              providerId: data.providerId
            }
          }
        }
      }
    });
  }
}
