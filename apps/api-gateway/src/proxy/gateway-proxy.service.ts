import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SecureRpcService } from '@app/common';

@Injectable()
export class GatewayProxyService {
  constructor(private readonly secureRpc: SecureRpcService) {}

  async send<T = any>(
    client: ClientProxy,
    pattern: string | object,
    data: any = {},
    currentUser?: any,
  ): Promise<T> {
    const payload =
      typeof data === 'object' && data !== null && !Array.isArray(data)
        ? { ...data, currentUser }
        : { data, currentUser };

    try {
      return await this.secureRpc.send<T>(client, pattern, payload);
    } catch (err: any) {
      console.error(`RPC Exception [Pattern: ${JSON.stringify(pattern)}]:`, err);
      const statusCode =
        err?.status || err?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        err?.message || err?.response?.message || (typeof err === 'string' ? err : 'Microservice RPC Error');
      throw new HttpException(message, statusCode);
    }
  }
}