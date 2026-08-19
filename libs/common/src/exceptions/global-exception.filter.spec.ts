import { RpcException } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  it('preserves RPC status metadata for the gateway', async () => {
    const filter = new GlobalExceptionFilter();
    const result = filter.catch(
      new RpcException({ statusCode: 422, message: 'Không thể xác định tọa độ từ địa chỉ bất động sản.' }),
      { getType: () => 'rpc' } as any,
    );

    await expect(lastValueFrom(result as any)).rejects.toEqual({
      statusCode: 422,
      message: 'Không thể xác định tọa độ từ địa chỉ bất động sản.',
    });
  });
});
