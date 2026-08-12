import { Module } from "@nestjs/common";
import { CustomerKeysController } from "./keys.controller";
import { CustomerKeysService } from "./keys.service";

@Module({
    controllers: [CustomerKeysController],
    providers: [CustomerKeysService],
    exports: [CustomerKeysService],
})
export class KeysModule {}
