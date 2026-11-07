import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { PaymentsModule } from "./payments/payments.module";
import { CommonModule, ReliabilityModule } from "@app/common";
import { MetersModule } from "./meters/meters.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "../../.env" }),
    CommonModule.forRoot({
      serviceName: "BILLING_SERVICE_NAME",
      secretEnv: "BILLING_SERVICE_SECRET",
    }),
    ReliabilityModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    InvoicesModule,
    PaymentsModule,
    MetersModule
  ],
  controllers: [],
  providers: [],
})
export class BillingServiceModule { }
