import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { MeterReadingsModule } from './meter-readings/meter-readings.module';
import { RepairRequestsModule } from './repair-requests/repair-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    PrismaModule,
    PropertiesModule,
    RoomsModule,
    MeterReadingsModule,
    RepairRequestsModule
  ],
  controllers: [],
  providers: [],
})
export class PropertyServiceModule {}
