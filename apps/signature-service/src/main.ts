import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor, getRabbitMqOptions, SERVICE_QUEUES, HmacGuard } from '@app/common';
import { SignatureServiceModule } from './signature-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    SignatureServiceModule,
    getRabbitMqOptions(SERVICE_QUEUES.SIGNATURE),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalGuards(app.get(HmacGuard));

  await app.listen();
  console.log('✅ Signature Service is running and connected to RabbitMQ');
}
bootstrap();