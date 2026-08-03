import { NestFactory } from '@nestjs/core';
import { PropertyServiceModule } from './property-service.module';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.SERVICE_DATABASE_URL = process.env.PROPERTY_DATABASE_URL || process.env.DATABASE_URL;

async function bootstrap() {
  const app = await NestFactory.create(PropertyServiceModule);
  const port = process.env.PORT_PROPERTY_SERVICE || 3004;
  await app.listen(port);
  console.log(`🚀 Property Management Service running on http://localhost:${port}`);
}
bootstrap();

