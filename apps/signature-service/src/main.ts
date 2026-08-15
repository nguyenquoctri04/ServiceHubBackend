import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor, parseRedisUrl, HmacGuard } from '@app/common';
import { SignatureServiceModule } from './signature-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(SignatureServiceModule, {
    transport: Transport.REDIS,
    options: parseRedisUrl(process.env.REDIS_BROKER_URL),
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalGuards(app.get(HmacGuard));

  await app.listen();
  console.log('✅ Signature Service is running and connected to Redis');
  console.log('Signature Microservice is running and listening on Redis');
}
bootstrap();