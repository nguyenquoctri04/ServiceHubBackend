import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor, getRabbitMqOptions, SERVICE_QUEUES, HmacGuard } from '@app/common';
import { BillingServiceModule } from './billing-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    BillingServiceModule,
    getRabbitMqOptions(SERVICE_QUEUES.BILLING),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalGuards(app.get(HmacGuard));

  await app.listen();
  console.log('✅ Billing Service is running and connected to RabbitMQ (Ready)');
}
bootstrap();