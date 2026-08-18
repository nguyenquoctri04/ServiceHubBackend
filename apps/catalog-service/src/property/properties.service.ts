import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) { }

  async createProperty(
    providerId: string,
    dto: {
      propertyName: string;
      address: string;
      latitude: number;
      longitude: number;
      description?: string;
      status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    const now = new Date();
    return this.prisma.property.create({
      data: {
        providerId,
        propertyName: dto.propertyName.trim(),
        address: dto.address.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        description: dto.description?.trim() || null,
        status: dto.status ?? 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  async updateProperty(
    providerId: string,
    propertyId: string,
    dto: {
      propertyName?: string; address?: string; latitude?: number; longitude?: number;
      description?: string; status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    const data = {
      ...(dto.propertyName !== undefined && { propertyName: dto.propertyName.trim() }),
      ...(dto.address !== undefined && { address: dto.address.trim() }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      ...(dto.description !== undefined && { description: dto.description.trim() || null }),
      ...(dto.status !== undefined && { status: dto.status }),
      updatedAt: new Date(),
    };
    const result = await this.prisma.property.updateMany({
      where: { id: propertyId, providerId }, data,
    });
    if (result.count !== 1) throw new RpcException({ statusCode: 404, message: 'Property not found' });
    return this.getPropertyById(providerId, propertyId);
  }

  async deleteProperty(providerId: string, propertyId: string) {
    const blockCount = await this.prisma.block.count({ where: { propertyId, property: { providerId } } });
    if (blockCount > 0) {
      throw new RpcException({ statusCode: 409, message: 'Không thể xóa bất động sản đang có khu nhà hoặc phòng.' });
    }
    const result = await this.prisma.property.deleteMany({ where: { id: propertyId, providerId } });
    if (result.count !== 1) throw new RpcException({ statusCode: 404, message: 'Property not found' });
    return { success: true };
  }

  async createBlock(
    providerId: string,
    propertyId: string,
    dto: { blockName: string; status?: 'ACTIVE' | 'INACTIVE' },
  ) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, providerId },
      select: { id: true },
    });
    if (!property) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy bất động sản.' });
    }

    const now = new Date();
    return this.prisma.block.create({
      data: {
        propertyId: property.id,
        blockName: dto.blockName.trim(),
        status: dto.status ?? 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    });
  }

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

  async getBlocks(providerId: string, propertyId: string) {
    return this.prisma.block.findMany({
      where: {
        propertyId,
        property: { providerId },
      },
    });
  }

  async getFloors(providerId: string, blockId: string) {
    return this.prisma.floor.findMany({
      where: {
        blockId,
        block: {
          property: { providerId },
        },
      },
    });
  }

  async getRooms(providerId: string, floorId: string) {
    return this.prisma.room.findMany({
      where: {
        floorId,
        floor: {
          block: {
            property: { providerId },
          },
        },
      },
      include: { roomType: true },
    });
  }

  async getAllRooms(providerId: string, propertyId: string) {
    return this.prisma.room.findMany({
      where: {
        floor: {
          block: {
            propertyId,
            property: { providerId },
          }
        }
      },
      include: {
        floor: true,
        roomType: true
      }
    });
  }

  async getPropertyById(providerId: string, propertyId: string) {
    return this.prisma.property.findFirst({
      where: { id: propertyId, providerId },
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

  async getRoomTypes(providerId: string, propertyId: string) {
    return this.prisma.roomType.findMany({
      where: {
        propertyId,
        property: { providerId },
      },
      orderBy: {
        typeName: 'asc',
      },
    });
  }
}
