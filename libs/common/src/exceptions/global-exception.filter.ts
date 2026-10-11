import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { throwError, Observable } from 'rxjs';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost): Observable<any> | void {
    // Log mọi lỗi ra console để Dev dễ debug
    if (exception instanceof HttpException) {
      this.logger.error(`HTTP Status ${exception.getStatus()}: ${JSON.stringify(exception.getResponse())}`);
    } else {
      this.logger.error('Exception caught globally:', exception);
    }

    if (exception instanceof Error && !(exception instanceof HttpException)) {
      this.logger.error(exception.stack);
    }

    const ctxType = host.getType();

    if (ctxType === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();

      let rawStatus: any = exception instanceof HttpException
        ? exception.getStatus()
        : (exception?.statusCode || exception?.status || HttpStatus.INTERNAL_SERVER_ERROR);

      const status = typeof rawStatus === 'number' && Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599
        ? rawStatus
        : HttpStatus.INTERNAL_SERVER_ERROR;

      let message: any = 'Internal server error';
      if (exception instanceof HttpException) {
        const resp = exception.getResponse();
        if (typeof resp === 'string') {
          message = resp;
        } else if (Array.isArray(resp)) {
          message = resp;
        } else {
          message = (resp as any)?.message || exception.message;
        }
      } else if (exception instanceof Error) {
        message = exception.message;
      } else if (typeof exception === 'object' && exception !== null) {
        message = (exception as any)?.message || (exception as any)?.error || JSON.stringify(exception);
      }

      response.status(status).json({
        success: false,
        status,
        data: null,
        message: Array.isArray(message) ? message.join(', ') : message,
      });
      return;
    }

    if (ctxType === 'rpc') {
      let rpcError: any;

      if (exception instanceof RpcException) {
        rpcError = exception.getError();
      } else if (exception instanceof HttpException) {
        const resp = exception.getResponse();
        rpcError = typeof resp === 'object' && resp !== null
          ? { statusCode: exception.getStatus(), ...(resp as object) }
          : { statusCode: exception.getStatus(), message: resp };
      } else if (exception instanceof Error) {
        rpcError = { statusCode: 500, message: exception.message };
      } else {
        rpcError = exception;
      }

      return throwError(() => rpcError);
    }
  }
}
