import { NestFactory } from '@nestjs/core';
import { ContractServiceModule } from './contract-service.module';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.SERVICE_DATABASE_URL = process.env.CONTRACT_DATABASE_URL || process.env.DATABASE_URL;

async function bootstrap() {
  const app = await NestFactory.create(ContractServiceModule);
  const port = process.env.PORT_CONTRACT_SERVICE || 3006;
  await app.listen(port);
  console.log(`🚀 Contract Management Service running on http://localhost:${port}`);
}
bootstrap();

