import { Module } from "@nestjs/common";
import {
    PAYOS_CLIENT,
    PAYOS_PAYOUT_CLIENT,
    payOSProvider,
    payOSPayoutProvider,
} from "./payos.provider";
import { PayOSService } from "./payos.service";

@Module({
    providers: [payOSProvider, payOSPayoutProvider, PayOSService],
    exports: [PAYOS_CLIENT, PAYOS_PAYOUT_CLIENT, PayOSService],
})
export class PayOSModule {}
