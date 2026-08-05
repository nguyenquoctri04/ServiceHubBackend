import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor, parseRedisUrl } from '@app/common';
import { CatalogServiceModule } from './catalog-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(CatalogServiceModule, {
    transport: Transport.REDIS,
    options: parseRedisUrl(process.env.REDIS_URL),
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen();
  console.log('✅ Catalog Service is running and connected to Redis');
}
bootstrap();
