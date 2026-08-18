import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor } from '@app/common';
import { TraceIdInterceptor } from '@app/common/observability/trace-id.interceptor';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // Allow cookies to be sent
  });

  app.use(cookieParser());

  // Increase payload limit for Base64 eKYC image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(), new TraceIdInterceptor());

  await app.listen(process.env.PORT_API_GATEWAY || 3000);
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
}
bootstrap();
