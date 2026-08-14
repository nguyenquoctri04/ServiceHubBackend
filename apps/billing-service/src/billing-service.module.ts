import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { MetersModule } from './meters/meters.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    PrismaModule,
    InvoicesModule,
    PaymentsModule,
    MetersModule
  ],
  controllers: [],
  providers: [],
})
export class BillingServiceModule {}
