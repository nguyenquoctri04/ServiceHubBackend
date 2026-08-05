import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor } from '@app/common';
import { TraceIdInterceptor } from '@app/common/observability/trace-id.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(), new TraceIdInterceptor());
  
  await app.listen(process.env.PORT_API_GATEWAY || 3000);
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
}
bootstrap();
