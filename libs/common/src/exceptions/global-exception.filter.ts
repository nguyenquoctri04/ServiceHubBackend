import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { throwError } from 'rxjs';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
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
      
      const status = exception instanceof HttpException
        ? exception.getStatus()
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
      const errorPayload = exception instanceof HttpException
        ? exception.getResponse()
        : (exception instanceof Error ? exception.message : exception);
        
      return throwError(() => errorPayload);
    }
  }
}
