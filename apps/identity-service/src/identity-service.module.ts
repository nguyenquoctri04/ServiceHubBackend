import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { IdentitiesModule } from "./identities/identities.module";
import { RolesModule } from "./roles/roles.module";
import { EkycModule } from "./ekyc/ekyc.module";
import { ProvidersModule } from "./providers/providers.module";
import { CommonModule } from "@app/common";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    CommonModule.forRoot({
      serviceName: "IDENTITY_SERVICE_NAME",
      secretEnv: "IDENTITY_SERVICE_SECRET",
    }),
    PrismaModule,
    AuthModule,
    IdentitiesModule,
    RolesModule,
    EkycModule,
    ProvidersModule,
  ],
  controllers: [],
  providers: [],
})
export class IdentityServiceModule {}
