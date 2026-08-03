import { NestFactory } from '@nestjs/core';
import { AuditServiceModule } from './audit-service.module';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.SERVICE_DATABASE_URL = process.env.AUDIT_DATABASE_URL || process.env.DATABASE_URL;

async function bootstrap() {
  const app = await NestFactory.create(AuditServiceModule);
  const port = process.env.PORT_AUDIT_SERVICE || 3010;
  await app.listen(port);
  console.log(`🚀 Audit Log Service running on http://localhost:${port}`);
}
bootstrap();
