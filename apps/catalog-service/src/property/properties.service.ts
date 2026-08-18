import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) { }

  async getRoomsByIds(roomIds: string[]) {
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

  async getProperties(providerId: string) {
    const properties = await this.prisma.property.findMany({
      where: {
        providerId
      },
      include: {
        blocks: {
          include: {
            floors: {
              include: {
                rooms: {
                  select: {
                    id: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return properties.map(({ blocks, ...property }) => {
      const rooms = blocks.flatMap(block =>
        block.floors.flatMap(floor => floor.rooms)
      );

      return {
        ...property,

        totalRooms: rooms.length,

        emptyRooms: rooms.filter(
          room => room.status === 'ACTIVE'
        ).length
      };
    });
  }

  async getBlocks(propertyId: string) {
    return this.prisma.block.findMany({
      where: { propertyId }
    });
  }

  async getFloors(blockId: string) {
    return this.prisma.floor.findMany({
      where: { blockId }
    });
  }

  async getRooms(floorId: string) {
    return this.prisma.room.findMany({
      where: { floorId },
      include: { roomType: true }
    });
  }

  async getAllRooms(propertyId: string) {
    return this.prisma.room.findMany({
      where: {
        floor: {
          block: {
            propertyId
          }
        }
      },
      include: {
        floor: true,
        roomType: true
      }
    });
  }

  async countRooms(providerId: string) {
    return this.prisma.room.count({
      where: {
        floor: {
          block: {
            property: {
              providerId
            }
          }
        }
      }
    });
  }
}
