import { DynamicModule, Module } from "@nestjs/common";

import { ConfigModule, ConfigService } from "@nestjs/config";

import { HmacService } from "./security/hmac.service";
import { ReplayProtectionService } from "./security/replay-protection.service";
import { RedisService } from "./utils/redis.service";
import { HmacGuard } from "./guards/hmac.guard";

import {
    SecureRpcService,
    SERVICE_IDENTITY,
} from "./security/secure-rpc.service";

export interface CommonModuleOptions {
    serviceName: string;
    secretEnv: string;
}

@Module({})
export class CommonModule {
    static forRoot(options: CommonModuleOptions): DynamicModule {
        return {
            module: CommonModule,

            global: true,

            imports: [ConfigModule],

            providers: [
                HmacService,

                RedisService,

                ReplayProtectionService,

                HmacGuard,

                {
                    provide: SERVICE_IDENTITY,

                    useFactory: (config: ConfigService) => ({
                        // options.serviceName là TÊN BIẾN ENV (vd "CATALOG_SERVICE_NAME"),
                        // phải đọc qua ConfigService để lấy giá trị thật đã set trong .env,
                        // không được dùng thẳng options.serviceName làm identity.
                        name: config.getOrThrow<string>(options.serviceName),

                        secret: config.getOrThrow<string>(options.secretEnv),
                    }),

                    inject: [ConfigService],
                },

                SecureRpcService,
            ],

            exports: [
                HmacService,
                SecureRpcService,
                SERVICE_IDENTITY,
                HmacGuard,
                ReplayProtectionService,
            ],
        };
    }
}
