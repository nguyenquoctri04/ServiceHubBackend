import 'reflect-metadata';
import { validate } from 'class-validator';
import { DashboardRoomsQueryDto, GroupedMeterQueryDto } from './meter.dto';
import { CreateRoomDto } from './property.dto';

describe('DashboardRoomsQueryDto', () => {
  it('accepts a UUID-shaped property identifier stored by the existing schema', async () => {
    const dto = Object.assign(new DashboardRoomsQueryDto(), {
      propertyId: '64000000-0000-0000-0000-000000000001',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a property identifier that is not UUID-shaped', async () => {
    const dto = Object.assign(new DashboardRoomsQueryDto(), {
      propertyId: 'not-a-property-id',
    });

    await expect(validate(dto)).resolves.toHaveLength(1);
  });
});

describe('GroupedMeterQueryDto', () => {
  it('accepts the UUID-shaped property identifier used by existing meter data', async () => {
    const dto = Object.assign(new GroupedMeterQueryDto(), {
      propertyId: '64000000-0000-0000-0000-000000000001',
      month: 8,
      year: 2026,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('continues to reject a malformed property identifier', async () => {
    const dto = Object.assign(new GroupedMeterQueryDto(), {
      propertyId: 'not-a-property-id',
      month: 8,
      year: 2026,
    });

    await expect(validate(dto)).resolves.toHaveLength(1);
  });
});

describe('CreateRoomDto', () => {
  it('accepts UUID-shaped room hierarchy identifiers used by existing seed data', async () => {
    const dto = Object.assign(new CreateRoomDto(), {
      floorId: '65000000-0000-0000-0000-000000000001',
      roomTypeId: '66000000-0000-0000-0000-000000000001',
      roomNumber: 'P.101',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('continues to reject malformed room hierarchy identifiers', async () => {
    const dto = Object.assign(new CreateRoomDto(), {
      floorId: 'invalid-floor',
      roomTypeId: 'invalid-room-type',
      roomNumber: 'P.101',
    });

    await expect(validate(dto)).resolves.toHaveLength(2);
  });
});
