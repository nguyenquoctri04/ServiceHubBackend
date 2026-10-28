import { Module } from "@nestjs/common";
import { payOSProvider } from "./payos.provider";
import { PayOSService } from "./payos.service";

@Module({
    providers: [payOSProvider, PayOSService],
    exports: [payOSProvider, PayOSService],
})
export class PayOSModule {}
