import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor, getRabbitMqOptions, SERVICE_QUEUES, HmacGuard } from '@app/common';
import { CatalogServiceModule } from './catalog-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CatalogServiceModule,
    getRabbitMqOptions(SERVICE_QUEUES.CATALOG),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalGuards(app.get(HmacGuard));

  await app.listen();
  console.log('✅ Catalog Service is running and connected to RabbitMQ (Ready)');
}
bootstrap();