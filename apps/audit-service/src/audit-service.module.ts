import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { CommonModule } from "@app/common";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    CommonModule.forRoot({
      serviceName: "AUDIT_SERVICE_NAME",
      secretEnv: "AUDIT_SERVICE_SECRET",
    }),
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [],
  providers: [],
})
export class AuditServiceModule {}
