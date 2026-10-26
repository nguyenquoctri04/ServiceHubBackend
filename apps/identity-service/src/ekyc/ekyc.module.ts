import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EkycController } from './ekyc.controller';
import { EkycService } from './ekyc.service';

@Module({
    imports: [
        HttpModule.register({
            timeout: 65_000,  // phải >= timeout trong service (60s)
        }),
    ],
    controllers: [EkycController],
    providers:   [EkycService],
})
export class EkycModule {}
