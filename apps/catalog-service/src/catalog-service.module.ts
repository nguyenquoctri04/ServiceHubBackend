import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { CategoriesModule } from "./categories/categories.module";
import { UnitsModule } from "./units/units.module";
import { ServicesModule } from "./services/services.module";
import { LocationModule } from "./location/location.module";
import { CommonModule } from "@app/common";
import { RoomsController } from "./rooms.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "../../.env" }),
    CommonModule.forRoot({
      serviceName: "CATALOG_SERVICE_NAME",
      secretEnv: "CATALOG_SERVICE_SECRET",
    }),
    PrismaModule,
    CategoriesModule,
    UnitsModule,
    ServicesModule,
    LocationModule,
  ],
  controllers: [RoomsController],
  providers: [],
})
export class CatalogServiceModule {}
