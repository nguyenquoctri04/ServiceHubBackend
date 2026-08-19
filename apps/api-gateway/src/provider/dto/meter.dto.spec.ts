import 'reflect-metadata';
import { validate } from 'class-validator';
import { DashboardRoomsQueryDto } from './meter.dto';

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
