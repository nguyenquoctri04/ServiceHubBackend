import { NestFactory } from '@nestjs/core';
import { NotificationServiceModule } from './notification-service.module';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.SERVICE_DATABASE_URL = process.env.NOTIFICATION_DATABASE_URL || process.env.DATABASE_URL;

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);
  const port = process.env.PORT_NOTIFICATION_SERVICE || 3009;
  await app.listen(port);
  console.log(`🚀 Notification Service running on http://localhost:${port}`);
}
bootstrap();

