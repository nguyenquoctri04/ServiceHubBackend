import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ResidentsModule } from './residents/residents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    PrismaModule,
    ResidentsModule
  ],
  controllers: [],
  providers: [],
})
export class CustomerServiceModule {}
