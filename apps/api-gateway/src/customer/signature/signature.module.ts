import { Module } from "@nestjs/common";

import { KeysModule } from "./keys/keys.module";
import { SignaturesModule } from "./signatures/signatures.module";

@Module({
    imports: [KeysModule, SignaturesModule],
})
export class SignatureModule {}
