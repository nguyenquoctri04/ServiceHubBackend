import { NestFactory } from '@nestjs/core';
import { BillingServiceModule } from './billing-service.module';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.SERVICE_DATABASE_URL = process.env.BILLING_DATABASE_URL || process.env.DATABASE_URL;

async function bootstrap() {
  const app = await NestFactory.create(BillingServiceModule);
  const port = process.env.PORT_BILLING_SERVICE || 3008;
  await app.listen(port);
  console.log(`🚀 Billing & Payment Service running on http://localhost:${port}`);
}
bootstrap();

