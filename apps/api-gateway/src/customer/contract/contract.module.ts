import { Module } from '@nestjs/common';

import { ContractsModule } from './contracts/contracts.module';
import { TemplatesModule } from './templates/templates.module';
import { TermsModule } from './terms/terms.module';
import { ViolationsModule } from './violations/violations.module';

@Module({
  imports: [
    ContractsModule,
    TemplatesModule,
    TermsModule,
    ViolationsModule,
  ],
})
export class ContractModule {}