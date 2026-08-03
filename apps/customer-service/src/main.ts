import { NestFactory } from '@nestjs/core';
import { CustomerServiceModule } from './customer-service.module';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.SERVICE_DATABASE_URL = process.env.CUSTOMER_DATABASE_URL || process.env.DATABASE_URL;

async function bootstrap() {
  const app = await NestFactory.create(CustomerServiceModule);
  const port = process.env.PORT_CUSTOMER_SERVICE || 3003;
  await app.listen(port);
  console.log(`🚀 Customer Service running on http://localhost:${port}`);
}
bootstrap();

