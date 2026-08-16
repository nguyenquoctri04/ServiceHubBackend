import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor } from '@app/common';
import { TraceIdInterceptor } from '@app/common/observability/trace-id.interceptor';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cần thiết để ThrottlerGuard (và mọi logic dựa vào req.ip) lấy đúng IP
  // gốc của client từ header X-Forwarded-For khi gateway chạy sau reverse
  // proxy/load balancer, thay vì lấy nhầm IP của proxy cho mọi request.
  app.set('trust proxy', 1);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // Allow cookies to be sent
  });

  app.use(cookieParser());

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(), new TraceIdInterceptor());
  
  await app.listen(process.env.PORT_API_GATEWAY || 3000);
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
}
bootstrap();