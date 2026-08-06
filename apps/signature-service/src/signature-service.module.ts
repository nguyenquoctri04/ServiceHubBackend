import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { KeysModule } from './keys/keys.module';
import { SignaturesModule } from './signatures/signatures.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    PrismaModule,
    KeysModule,
    SignaturesModule
  ],
  controllers: [],
  providers: [],
})
export class SignatureServiceModule {}
