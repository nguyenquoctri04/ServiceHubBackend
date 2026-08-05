import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { IdentitiesModule } from './identities/identities.module';
import { RolesModule } from './roles/roles.module';
import { EkycModule } from './ekyc/ekyc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    AuthModule,
    IdentitiesModule,
    RolesModule,
    EkycModule,
  ],
  controllers: [],
  providers: [],
})
export class IdentityServiceModule {}
