import { NestFactory } from '@nestjs/core';
import { CatalogServiceModule } from './catalog-service.module';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.SERVICE_DATABASE_URL = process.env.CATALOG_DATABASE_URL || process.env.DATABASE_URL;

async function bootstrap() {
  const app = await NestFactory.create(CatalogServiceModule);
  const port = process.env.PORT_CATALOG_SERVICE || 3005;
  await app.listen(port);
  console.log(`🚀 Service Catalog Service running on http://localhost:${port}`);
}
bootstrap();

