import { NestFactory } from '@nestjs/core';
import { SignatureServiceModule } from './signature-service.module';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.SERVICE_DATABASE_URL = process.env.SIGNATURE_DATABASE_URL || process.env.DATABASE_URL;

async function bootstrap() {
  const app = await NestFactory.create(SignatureServiceModule);
  const port = process.env.PORT_SIGNATURE_SERVICE || 3007;
  await app.listen(port);
  console.log(`🚀 Digital Signature Service running on http://localhost:${port}`);
}
bootstrap();

