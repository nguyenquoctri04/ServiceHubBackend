import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ProviderServiceModule } from './provider-service.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor, parseRedisUrl } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ProviderServiceModule, {
    transport: Transport.REDIS,
    options: parseRedisUrl(process.env.REDIS_URL),
  });

  // Apply filters and pipes globally at microservice level
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen();
  console.log('✅ Provider Service is running and connected to Redis');
}
bootstrap();
