import { PropertiesService } from './properties.service';

describe('PropertiesService', () => {
  const prisma = {
    room: { findMany: jest.fn() },
  } as any;

  const service = new PropertiesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes rooms loaded by floor to the active provider', async () => {
    prisma.room.findMany.mockResolvedValue([]);

    await service.getRooms('provider-1', 'floor-1');

    expect(prisma.room.findMany).toHaveBeenCalledWith({
      where: {
        floorId: 'floor-1',
        floor: {
          block: {
            property: {
              providerId: 'provider-1',
            },
          },
        },
      },
      include: { roomType: true },
    });
  });

  it('sets the provider from trusted server context when creating a property', async () => {
    prisma.property = { create: jest.fn().mockResolvedValue({ id: 'property-1' }) };

    await service.createProperty('provider-1', {
      propertyName: 'Khu nhà A',
      address: 'Quận 1, TP. Hồ Chí Minh',
      latitude: 10.7769,
      longitude: 106.7009,
    });

    expect(prisma.property.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerId: 'provider-1',
        propertyName: 'Khu nhà A',
        status: 'ACTIVE',
      }),
    });
  });

  it('updates only a property owned by the active provider', async () => {
    prisma.property = {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue({ id: 'property-1' }),
    };

    await service.updateProperty('provider-1', 'property-1', { propertyName: 'Khu nhà B' });

    expect(prisma.property.updateMany).toHaveBeenCalledWith({
      where: { id: 'property-1', providerId: 'provider-1' },
      data: expect.objectContaining({ propertyName: 'Khu nhà B' }),
    });
  });

  it('rejects deletion when the owned property still has blocks', async () => {
    prisma.block = { count: jest.fn().mockResolvedValue(1) };

    await expect(service.deleteProperty('provider-1', 'property-1')).rejects.toMatchObject({
      error: { message: 'Không thể xóa bất động sản đang có khu nhà hoặc phòng.' },
    });
  });

  it('creates a block only under a property owned by the active provider', async () => {
    prisma.property = { findFirst: jest.fn().mockResolvedValue({ id: 'property-1' }) };
    prisma.block = { create: jest.fn().mockResolvedValue({ id: 'block-1' }) };

    await service.createBlock('provider-1', 'property-1', { blockName: 'Khu A' });

    expect(prisma.block.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ propertyId: 'property-1', blockName: 'Khu A', status: 'ACTIVE' }),
    });
  });

  it('rejects block creation when the property belongs to another provider', async () => {
    prisma.property = { findFirst: jest.fn().mockResolvedValue(null) };
    prisma.block = { create: jest.fn() };

    await expect(service.createBlock('provider-1', 'property-2', { blockName: 'Khu A' })).rejects.toMatchObject({
      error: { message: 'Không tìm thấy bất động sản.' },
    });
    expect(prisma.block.create).not.toHaveBeenCalled();
  });

  it('creates a floor only under a block owned by the active provider', async () => {
    prisma.block = { findFirst: jest.fn().mockResolvedValue({ id: 'block-1' }) };
    prisma.floor = { create: jest.fn().mockResolvedValue({ id: 'floor-1' }) };

    await service.createFloor('provider-1', 'block-1', { floorName: 'Tầng 1' });

    expect(prisma.floor.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ blockId: 'block-1', floorName: 'Tầng 1', status: 'ACTIVE' }),
    });
  });

  it('creates a room type only under a property owned by the active provider', async () => {
    prisma.property = { findFirst: jest.fn().mockResolvedValue({ id: 'property-1' }) };
    prisma.roomType = { create: jest.fn().mockResolvedValue({ id: 'room-type-1' }) };

    await service.createRoomType('provider-1', 'property-1', {
      typeName: 'Phòng tiêu chuẩn', area: 25, maxOccupancy: 2,
    });

    expect(prisma.roomType.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        propertyId: 'property-1', typeName: 'Phòng tiêu chuẩn', area: 25, maxOccupancy: 2, status: 'ACTIVE',
      }),
    });
  });

  it('creates a room only when its floor and room type belong to the same active-provider property', async () => {
    prisma.floor = {
      findFirst: jest.fn().mockResolvedValue({ id: 'floor-1', block: { propertyId: 'property-1' } }),
    };
    prisma.roomType = { findFirst: jest.fn().mockResolvedValue({ id: 'room-type-1' }) };
    prisma.room = { create: jest.fn().mockResolvedValue({ id: 'room-1' }) };

    await service.createRoom('provider-1', {
      floorId: 'floor-1', roomTypeId: 'room-type-1', roomNumber: 'P.101', status: 'ACTIVE',
    });

    expect(prisma.roomType.findFirst).toHaveBeenCalledWith({
      where: { id: 'room-type-1', propertyId: 'property-1', property: { providerId: 'provider-1' } },
      select: { id: true },
    });
    expect(prisma.room.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ floorId: 'floor-1', roomTypeId: 'room-type-1', roomNumber: 'P.101', status: 'ACTIVE' }),
    });
  });

  it('refuses to delete a block when it still has floors', async () => {
    prisma.floor = { count: jest.fn().mockResolvedValue(1) };

    await expect(service.deleteBlock('provider-1', 'block-1')).rejects.toMatchObject({
      error: { message: 'Không thể xóa khu nhà đang có tầng hoặc phòng.' },
    });
  });

  it('refuses to delete a floor when it still has rooms', async () => {
    prisma.room = { count: jest.fn().mockResolvedValue(1) };

    await expect(service.deleteFloor('provider-1', 'floor-1')).rejects.toMatchObject({
      error: { message: 'Không thể xóa tầng đang có phòng.' },
    });
  });

  it('updates only a block owned by the active provider', async () => {
    prisma.block = {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue({ id: 'block-1', blockName: 'Khu B' }),
    };

    await service.updateBlock('provider-1', 'block-1', { blockName: 'Khu B' });

    expect(prisma.block.updateMany).toHaveBeenCalledWith({
      where: { id: 'block-1', property: { providerId: 'provider-1' } },
      data: expect.objectContaining({ blockName: 'Khu B' }),
    });
  });

  it('updates only a floor owned by the active provider', async () => {
    prisma.floor = {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue({ id: 'floor-1', floorName: 'Tầng 2' }),
    };

    await expect(service.updateFloor('provider-1', 'floor-1', { floorName: 'Tầng 2' }))
      .resolves.toMatchObject({ id: 'floor-1', floorName: 'Tầng 2' });
    expect(prisma.floor.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'floor-1', block: { property: { providerId: 'provider-1' } } },
    }));
  });
});
