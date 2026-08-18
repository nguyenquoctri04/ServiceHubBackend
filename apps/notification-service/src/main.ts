import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter, ResponseInterceptor, parseRedisUrl, HmacGuard } from '@app/common';
import { NotificationServiceModule } from './notification-service.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: parseRedisUrl(process.env.REDIS_BROKER_URL),
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalGuards(app.get(HmacGuard));

  await app.startAllMicroservices();
  await app.listen(process.env.PORT_NOTIFICATION_SERVICE || 3009);

  console.log('✅ Notification Service is running with Redis and WebSocket');
  console.log(`Notification WebSocket namespace: ${await app.getUrl()}/notifications`);
}
bootstrap();
