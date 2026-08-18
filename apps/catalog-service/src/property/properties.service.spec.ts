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
});
