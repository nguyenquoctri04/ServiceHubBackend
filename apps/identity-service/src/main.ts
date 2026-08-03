import { NestFactory } from '@nestjs/core';
import { IdentityServiceModule } from './identity-service.module';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.SERVICE_DATABASE_URL = process.env.IDENTITY_DATABASE_URL || process.env.DATABASE_URL;

async function bootstrap() {
  const app = await NestFactory.create(IdentityServiceModule);
  const port = process.env.PORT_IDENTITY_SERVICE || 3001;
  await app.listen(port);
  console.log(`🚀 Identity & eKYC Service running on http://localhost:${port}`);
}
bootstrap();

