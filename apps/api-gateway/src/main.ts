import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor } from '@app/common';
import { TraceIdInterceptor } from '@app/common/observability/trace-id.interceptor';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust reverse-proxy headers so ThrottlerGuard sees real client IP
  app.set('trust proxy', 1);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.use(cookieParser());

  // Increase payload limit for Base64 eKYC image uploads (~2 images × ~400KB)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Security headers
  const helmet = require('helmet');
  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(), new TraceIdInterceptor());

  await app.listen(process.env.PORT_API_GATEWAY || 3000);
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
}

bootstrap();
