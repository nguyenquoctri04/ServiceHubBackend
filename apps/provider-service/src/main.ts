import { NestFactory } from '@nestjs/core';
import { ProviderServiceModule } from './provider-service.module';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.SERVICE_DATABASE_URL = process.env.PROVIDER_DATABASE_URL || process.env.DATABASE_URL;

async function bootstrap() {
  const app = await NestFactory.create(ProviderServiceModule);
  const port = process.env.PORT_PROVIDER_SERVICE || 3002;
  await app.listen(port);
  console.log(`🚀 Provider Service running on http://localhost:${port}`);
}
bootstrap();

