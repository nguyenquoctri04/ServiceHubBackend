import { Module } from '@nestjs/common';

import { AuditModule } from './audit/audit.module';
import { BillingModule } from './billing/billing.module';
import { CatalogModule } from './catalog/catalog.module';
import { ContractModule } from './contract/contract.module';
import { IdentityModule } from './identity/identity.module';
import { NotificationModule } from './notification/notification.module';
import { SignatureModule } from './signature/signature.module';

@Module({
  imports: [
    AuditModule,
    BillingModule,
    CatalogModule,
    ContractModule,
    IdentityModule,
    NotificationModule,
    SignatureModule,
  ],
})
export class CustomerModule {}