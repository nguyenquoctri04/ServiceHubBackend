import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  status: number;
  data: T;
  message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctxType = context.getType();
    
    return next.handle().pipe(
      map(data => {
        if (ctxType === 'http') {
          const response = context.switchToHttp().getResponse();
          const status = response.statusCode;
          return {
            success: true,
            status,
            data: data !== undefined ? data : null,
            message: 'Success',
          };
        }
        return data;
      }),
    );
  }
}
