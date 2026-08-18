import { MetersService } from './meters.service';

describe('MetersService.findGroupedMeters', () => {
  const makeService = () => {
    const prisma = {
      meter: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'meter-electric', serviceId: 'electric', name: 'Điện', unit: 'kWh' },
        ]),
      },
      meterReading: {
        findMany: jest.fn()
          .mockResolvedValueOnce([{ id: 'current', roomId: 'room-1', meterId: 'meter-electric', value: 120 }])
          .mockResolvedValueOnce([{ id: 'previous', roomId: 'room-1', meterId: 'meter-electric', value: 100 }]),
      },
    };
    return { service: new MetersService(prisma as any, {} as any, {} as any, {} as any, {} as any), prisma };
  };

  it('groups current and previous readings with three bounded queries', async () => {
    const { service, prisma } = makeService();

    await expect(service.findGroupedMeters('provider-1', ['room-1', 'room-2'], 8, 2026)).resolves.toEqual({
      'room-1': [{
        meter: { id: 'meter-electric', serviceId: 'electric', serviceName: 'Điện', unit: 'kWh' },
        currentReading: { id: 'current', roomId: 'room-1', meterId: 'meter-electric', value: 120 },
        previousReading: { id: 'previous', roomId: 'room-1', meterId: 'meter-electric', value: 100 },
      }],
      'room-2': [{
        meter: { id: 'meter-electric', serviceId: 'electric', serviceName: 'Điện', unit: 'kWh' },
        currentReading: null,
        previousReading: null,
      }],
    });

    expect(prisma.meter.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.meterReading.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.meterReading.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ roomId: { in: ['room-1', 'room-2'] }, meter: { providerId: 'provider-1' } }),
    }));
  });

  it('returns immediately without querying when no rooms are provided', async () => {
    const { service, prisma } = makeService();

    await expect(service.findGroupedMeters('provider-1', [], 8, 2026)).resolves.toEqual({});
    expect(prisma.meter.findMany).not.toHaveBeenCalled();
    expect(prisma.meterReading.findMany).not.toHaveBeenCalled();
  });
});
