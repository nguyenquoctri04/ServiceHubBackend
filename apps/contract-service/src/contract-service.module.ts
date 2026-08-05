import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { TemplatesModule } from './templates/templates.module';
import { ContractsModule } from './contracts/contracts.module';
import { TermsModule } from './terms/terms.module';
import { ViolationsModule } from './violations/violations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    PrismaModule,
    TemplatesModule,
    ContractsModule,
    TermsModule,
    ViolationsModule
  ],
  controllers: [],
  providers: [],
})
export class ContractServiceModule {}
