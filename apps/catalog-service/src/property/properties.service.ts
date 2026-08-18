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

  async deleteBlock(providerId: string, blockId: string) {
    const floorCount = await this.prisma.floor.count({
      where: { blockId, block: { property: { providerId } } },
    });
    if (floorCount > 0) {
      throw new RpcException({ statusCode: 409, message: 'Không thể xóa khu nhà đang có tầng hoặc phòng.' });
    }

    const result = await this.prisma.block.deleteMany({
      where: { id: blockId, property: { providerId } },
    });
    if (result.count !== 1) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy khu nhà.' });
    }
    return { success: true };
  }

  async updateBlock(
    providerId: string,
    blockId: string,
    dto: { blockName?: string; status?: 'ACTIVE' | 'INACTIVE' },
  ) {
    const result = await this.prisma.block.updateMany({
      where: { id: blockId, property: { providerId } },
      data: {
        ...(dto.blockName !== undefined && { blockName: dto.blockName.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        updatedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy khu nhà.' });
    }
    return this.prisma.block.findFirst({ where: { id: blockId, property: { providerId } } });
  }

  async createFloor(
    providerId: string,
    blockId: string,
    dto: { floorName: string; status?: 'ACTIVE' | 'INACTIVE' },
  ) {
    const block = await this.prisma.block.findFirst({
      where: { id: blockId, property: { providerId } },
      select: { id: true },
    });
    if (!block) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy khu nhà.' });
    }

    const now = new Date();
    return this.prisma.floor.create({
      data: {
        blockId: block.id,
        floorName: dto.floorName.trim(),
        status: dto.status ?? 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  async deleteFloor(providerId: string, floorId: string) {
    const roomCount = await this.prisma.room.count({
      where: { floorId, floor: { block: { property: { providerId } } } },
    });
    if (roomCount > 0) {
      throw new RpcException({ statusCode: 409, message: 'Không thể xóa tầng đang có phòng.' });
    }

    const result = await this.prisma.floor.deleteMany({
      where: { id: floorId, block: { property: { providerId } } },
    });
    if (result.count !== 1) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy tầng.' });
    }
    return { success: true };
  }

  async updateFloor(
    providerId: string,
    floorId: string,
    dto: { floorName?: string; status?: 'ACTIVE' | 'INACTIVE' },
  ) {
    const result = await this.prisma.floor.updateMany({
      where: { id: floorId, block: { property: { providerId } } },
      data: {
        ...(dto.floorName !== undefined && { floorName: dto.floorName.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        updatedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy tầng.' });
    }
    return this.prisma.floor.findFirst({
      where: { id: floorId, block: { property: { providerId } } },
    });
  }

  async createRoomType(
    providerId: string,
    propertyId: string,
    dto: {
      typeName: string;
      area: number;
      maxOccupancy: number;
      description?: string;
      status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, providerId },
      select: { id: true },
    });
    if (!property) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy bất động sản.' });
    }

    const now = new Date();
    return this.prisma.roomType.create({
      data: {
        propertyId: property.id,
        typeName: dto.typeName.trim(),
        area: dto.area,
        maxOccupancy: dto.maxOccupancy,
        description: dto.description?.trim() || null,
        status: dto.status ?? 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  async createRoom(
    providerId: string,
    dto: {
      floorId: string;
      roomTypeId: string;
      roomNumber: string;
      status?: 'ACTIVE' | 'MAINTENANCE';
    },
  ) {
    const floor = await this.prisma.floor.findFirst({
      where: { id: dto.floorId, block: { property: { providerId } } },
      select: { id: true, block: { select: { propertyId: true } } },
    });
    if (!floor) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy tầng.' });
    }

    const roomType = await this.prisma.roomType.findFirst({
      where: {
        id: dto.roomTypeId,
        propertyId: floor.block.propertyId,
        property: { providerId },
      },
      select: { id: true },
    });
    if (!roomType) {
      throw new RpcException({ statusCode: 400, message: 'Loại phòng không thuộc bất động sản này.' });
    }

    const now = new Date();
    return this.prisma.room.create({
      data: {
        floorId: floor.id,
        roomTypeId: roomType.id,
        roomNumber: dto.roomNumber.trim(),
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
