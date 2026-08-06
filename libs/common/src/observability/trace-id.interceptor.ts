import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctxType = context.getType();
    if (ctxType === 'http') {
      const request = context.switchToHttp().getRequest();
      request.traceId = request.headers['x-trace-id'] || uuidv4();
    }
    return next.handle();
  }
}
