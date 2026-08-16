import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { KeysModule } from './keys/keys.module';
import { SignaturesModule } from './signatures/signatures.module';
import { CommonModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    CommonModule.forRoot({
      serviceName: "SIGNATURE_SERVICE_NAME",
      secretEnv: "SIGNATURE_SERVICE_SECRET",
    }),
    PrismaModule,
    KeysModule,
    SignaturesModule
  ],
  controllers: [],
  providers: [],
})
export class SignatureServiceModule {}
