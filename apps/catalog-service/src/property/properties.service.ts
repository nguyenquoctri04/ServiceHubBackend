import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { LocationService } from '../location/location.service';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) { }

  private async resolveCoordinates(address: string) {
    const normalizedAddress = address.trim();
    const coordinates = await this.locationService.geocode(normalizedAddress);
    if (!coordinates) {
      throw new RpcException({ statusCode: 422, message: 'Không thể xác định tọa độ từ địa chỉ bất động sản.' });
    }
    return { address: normalizedAddress, latitude: coordinates.lat, longitude: coordinates.lng };
  }

  async createProperty(
    providerId: string,
    dto: {
      propertyName: string;
      address: string;
      description?: string;
      status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    const location = await this.resolveCoordinates(dto.address);
    const now = new Date();
    return this.prisma.property.create({
      data: {
        providerId,
        propertyName: dto.propertyName.trim(),
        ...location,
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
      propertyName?: string; address?: string;
      description?: string; status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    const location = dto.address === undefined ? undefined : await this.resolveCoordinates(dto.address);
    const data = {
      ...(dto.propertyName !== undefined && { propertyName: dto.propertyName.trim() }),
      ...(location !== undefined && location),
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

  async updateRoomType(providerId: string, roomTypeId: string, dto: {
    typeName?: string; area?: number; maxOccupancy?: number; description?: string; status?: 'ACTIVE' | 'INACTIVE';
  }) {
    const result = await this.prisma.roomType.updateMany({
      where: { id: roomTypeId, property: { providerId } },
      data: {
        ...(dto.typeName !== undefined && { typeName: dto.typeName.trim() }),
        ...(dto.area !== undefined && { area: dto.area }),
        ...(dto.maxOccupancy !== undefined && { maxOccupancy: dto.maxOccupancy }),
        ...(dto.description !== undefined && { description: dto.description.trim() || null }),
        ...(dto.status !== undefined && { status: dto.status }),
        updatedAt: new Date(),
      },
    });
    if (result.count !== 1) throw new RpcException({ statusCode: 404, message: 'Không tìm thấy loại phòng.' });
    return this.prisma.roomType.findFirst({ where: { id: roomTypeId, property: { providerId } } });
  }

  async deleteRoomType(providerId: string, roomTypeId: string) {
    const ownership = { id: roomTypeId, property: { providerId } };
    const [roomCount, serviceCount] = await Promise.all([
      this.prisma.room.count({ where: { roomTypeId, roomType: { property: { providerId } } } }),
      this.prisma.service.count({ where: { roomTypeId, providerId } }),
    ]);
    if (roomCount > 0 || serviceCount > 0) {
      throw new RpcException({ statusCode: 409, message: 'Không thể xóa loại phòng đang được phòng hoặc dịch vụ sử dụng.' });
    }
    const result = await this.prisma.roomType.deleteMany({ where: ownership });
    if (result.count !== 1) throw new RpcException({ statusCode: 404, message: 'Không tìm thấy loại phòng.' });
    return { success: true };
  }

  async updateRoom(providerId: string, roomId: string, dto: {
    floorId?: string; roomTypeId?: string; roomNumber?: string; status?: 'ACTIVE' | 'MAINTENANCE';
  }) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, floor: { block: { property: { providerId } } } },
      select: { id: true, floorId: true, roomTypeId: true },
    });
    if (!room) throw new RpcException({ statusCode: 404, message: 'Không tìm thấy phòng.' });

    const floorId = dto.floorId ?? room.floorId;
    if (!floorId) throw new RpcException({ statusCode: 400, message: 'Phòng phải thuộc một tầng.' });
    const floor = await this.prisma.floor.findFirst({
      where: { id: floorId, block: { property: { providerId } } },
      select: { id: true, block: { select: { propertyId: true } } },
    });
    if (!floor) throw new RpcException({ statusCode: 400, message: 'Tầng không thuộc bất động sản của bạn.' });

    const roomType = await this.prisma.roomType.findFirst({
      where: { id: dto.roomTypeId ?? room.roomTypeId, propertyId: floor.block.propertyId, property: { providerId } },
      select: { id: true },
    });
    if (!roomType) throw new RpcException({ statusCode: 400, message: 'Loại phòng không thuộc bất động sản của tầng đã chọn.' });

    const result = await this.prisma.room.updateMany({
      where: { id: roomId, floor: { block: { property: { providerId } } } },
      data: {
        floorId: floor.id,
        roomTypeId: roomType.id,
        ...(dto.roomNumber !== undefined && { roomNumber: dto.roomNumber.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        updatedAt: new Date(),
      },
    });
    if (result.count !== 1) throw new RpcException({ statusCode: 404, message: 'Không tìm thấy phòng.' });
    return this.prisma.room.findFirst({ where: { id: roomId, floor: { block: { property: { providerId } } } }, include: { roomType: true } });
  }

  async deleteRoom(providerId: string, roomId: string) {
    const result = await this.prisma.room.deleteMany({
      where: { id: roomId, floor: { block: { property: { providerId } } } },
    });
    if (result.count !== 1) throw new RpcException({ statusCode: 404, message: 'Không tìm thấy phòng.' });
    return { success: true };
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

  async findRoomsByIdsForProvider(providerId: string, roomIds: string[]) {
    return this.prisma.room.findMany({
      where: { id: { in: roomIds }, floor: { block: { property: { providerId } } } },
      select: { id: true, roomNumber: true },
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

  /** Loads rooms for the active workspace in one query for provider-wide selectors. */
  async getRoomsForProvider(providerId: string) {
    return this.prisma.room.findMany({
      where: { floor: { block: { property: { providerId } } } },
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
