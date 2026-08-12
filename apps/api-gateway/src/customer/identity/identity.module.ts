import { Module } from "@nestjs/common";

import { EkycModule } from "./ekyc/ekyc.module";
import { IdentitiesModule } from "./identities/identities.module";

@Module({
    imports: [EkycModule, IdentitiesModule],
})
export class IdentityModule {}
