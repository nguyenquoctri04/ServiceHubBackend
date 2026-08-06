import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor, parseRedisUrl } from '@app/common';
import { BillingServiceModule } from './billing-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(BillingServiceModule, {
    transport: Transport.REDIS,
    options: parseRedisUrl(process.env.REDIS_URL),
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen();
  console.log('✅ Billing Service is running and connected to Redis');
  console.log('Billing Microservice is running and listening on Redis');
}
bootstrap();
