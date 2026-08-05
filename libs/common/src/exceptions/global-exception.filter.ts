import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctxType = host.getType();
    
    if (ctxType === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      
      const status = exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

      let message = 'Internal server error';
      if (exception instanceof HttpException) {
        const resp = exception.getResponse();
        message = typeof resp === 'string' ? resp : (resp as any).message || resp;
      } else if (exception instanceof Error) {
        message = exception.message;
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
      if (exception instanceof RpcException) {
        return exception;
      }
      return new RpcException(exception);
    }
  }
}
