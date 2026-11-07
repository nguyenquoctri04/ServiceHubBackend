import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor, getRabbitMqOptions, SERVICE_QUEUES, HmacGuard } from '@app/common';
import { IdentityServiceModule } from './identity-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    IdentityServiceModule,
    getRabbitMqOptions(SERVICE_QUEUES.IDENTITY),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalGuards(app.get(HmacGuard));

  await app.listen();
  console.log('✅ Identity Service is running and connected to RabbitMQ (Ready)');
}
bootstrap();