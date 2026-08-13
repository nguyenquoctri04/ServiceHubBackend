import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError, timeout, retry } from 'rxjs';

@Injectable()
export class GatewayProxyService {
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

    return firstValueFrom(
      client.send(pattern, payload).pipe(
        timeout(3000),
        retry({ count: 3, delay: 1000 }),
        catchError((err) => {
          console.error(`RPC Exception [Pattern: ${JSON.stringify(pattern)}]:`, err);
          const statusCode =
            err?.status || err?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
          const message =
            err?.message || err?.response?.message || (typeof err === 'string' ? err : 'Microservice RPC Error');
          return throwError(() => new HttpException(message, statusCode));
        }),
      ),
    );
  }
}
