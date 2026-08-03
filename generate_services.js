const fs = require('fs');
const path = require('path');

const services = [
  { name: 'identity-service', portEnv: 'PORT_IDENTITY_SERVICE', portDefault: 3001, displayName: 'Identity & eKYC Service' },
  { name: 'provider-service', portEnv: 'PORT_PROVIDER_SERVICE', portDefault: 3002, displayName: 'Provider Service' },
  { name: 'customer-service', portEnv: 'PORT_CUSTOMER_SERVICE', portDefault: 3003, displayName: 'Customer Service' },
  { name: 'property-service', portEnv: 'PORT_PROPERTY_SERVICE', portDefault: 3004, displayName: 'Property Management Service' },
  { name: 'catalog-service', portEnv: 'PORT_CATALOG_SERVICE', portDefault: 3005, displayName: 'Service Catalog Service' },
  { name: 'contract-service', portEnv: 'PORT_CONTRACT_SERVICE', portDefault: 3006, displayName: 'Contract Management Service' },
  { name: 'signature-service', portEnv: 'PORT_SIGNATURE_SERVICE', portDefault: 3007, displayName: 'Digital Signature & OTP Service' },
  { name: 'billing-service', portEnv: 'PORT_BILLING_SERVICE', portDefault: 3008, displayName: 'Billing & Payment Service' },
  { name: 'notification-service', portEnv: 'PORT_NOTIFICATION_SERVICE', portDefault: 3009, displayName: 'Notification Service' },
  { name: 'audit-service', portEnv: 'PORT_AUDIT_SERVICE', portDefault: 3010, displayName: 'Audit Log Service' },
];

const baseDir = path.join(__dirname, 'apps');

function toPascalCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

services.forEach(svc => {
  const svcDir = path.join(baseDir, svc.name);
  const pascalName = toPascalCase(svc.name);

  // Directories
  const srcDir = path.join(svcDir, 'src');
  const adminCtrlDir = path.join(srcDir, 'controllers', 'admin');
  const custCtrlDir = path.join(srcDir, 'controllers', 'customer');
  const provCtrlDir = path.join(srcDir, 'controllers', 'provider');
  const prismaDir = path.join(svcDir, 'prisma');

  [adminCtrlDir, custCtrlDir, provCtrlDir, prismaDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

  // tsconfig.app.json
  const tsconfig = {
    extends: '../../tsconfig.json',
    compilerOptions: {
      declaration: false,
      outDir: `../../dist/apps/${svc.name}`
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', 'test', '**/*spec.ts']
  };
  fs.writeFileSync(path.join(svcDir, 'tsconfig.app.json'), JSON.stringify(tsconfig, null, 2));

  // prisma/schema.prisma
  const schemaPrisma = `// Prisma Schema for ${svc.displayName}
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ${pascalName}Record {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;
  fs.writeFileSync(path.join(prismaDir, 'schema.prisma'), schemaPrisma);

  // Service file
  const serviceContent = `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${pascalName}Service {
  getServiceInfo(): string {
    return '${svc.displayName} is operational';
  }
}
`;
  fs.writeFileSync(path.join(srcDir, `${svc.name}.service.ts`), serviceContent);

  // Controllers
  const adminCtrl = `import { Controller, Get } from '@nestjs/common';
import { ${pascalName}Service } from '../../${svc.name}.service';

@Controller('admin/${svc.name.replace('-service', '')}')
export class ${pascalName}AdminController {
  constructor(private readonly service: ${pascalName}Service) {}

  @Get('status')
  getStatus() {
    return {
      service: '${svc.displayName}',
      actor: 'ADMIN',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
`;
  fs.writeFileSync(path.join(adminCtrlDir, `${svc.name}-admin.controller.ts`), adminCtrl);

  const custCtrl = `import { Controller, Get } from '@nestjs/common';
import { ${pascalName}Service } from '../../${svc.name}.service';

@Controller('customer/${svc.name.replace('-service', '')}')
export class ${pascalName}CustomerController {
  constructor(private readonly service: ${pascalName}Service) {}

  @Get('status')
  getStatus() {
    return {
      service: '${svc.displayName}',
      actor: 'CUSTOMER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
`;
  fs.writeFileSync(path.join(custCtrlDir, `${svc.name}-customer.controller.ts`), custCtrl);

  const provCtrl = `import { Controller, Get } from '@nestjs/common';
import { ${pascalName}Service } from '../../${svc.name}.service';

@Controller('provider/${svc.name.replace('-service', '')}')
export class ${pascalName}ProviderController {
  constructor(private readonly service: ${pascalName}Service) {}

  @Get('status')
  getStatus() {
    return {
      service: '${svc.displayName}',
      actor: 'PROVIDER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
`;
  fs.writeFileSync(path.join(provCtrlDir, `${svc.name}-provider.controller.ts`), provCtrl);

  // Module file
  const moduleContent = `import { Module } from '@nestjs/common';
import { ${pascalName}Service } from './${svc.name}.service';
import { ${pascalName}AdminController } from './controllers/admin/${svc.name}-admin.controller';
import { ${pascalName}CustomerController } from './controllers/customer/${svc.name}-customer.controller';
import { ${pascalName}ProviderController } from './controllers/provider/${svc.name}-provider.controller';

@Module({
  controllers: [
    ${pascalName}AdminController,
    ${pascalName}CustomerController,
    ${pascalName}ProviderController,
  ],
  providers: [${pascalName}Service],
})
export class ${pascalName}Module {}
`;
  fs.writeFileSync(path.join(srcDir, `${svc.name}.module.ts`), moduleContent);

  // Main file
  const mainContent = `import { NestFactory } from '@nestjs/core';
import { ${pascalName}Module } from './${svc.name}.module';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(${pascalName}Module);
  const port = process.env.${svc.portEnv} || ${svc.portDefault};
  await app.listen(port);
  console.log('🚀 ${svc.displayName} running on http://localhost:' + port);
}
bootstrap();
`;
  fs.writeFileSync(path.join(srcDir, 'main.ts'), mainContent);
});

console.log('Successfully generated all 10 microservices boilerplate!');
