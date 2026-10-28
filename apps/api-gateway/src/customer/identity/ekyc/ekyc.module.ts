import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CustomerEkycController } from './ekyc.controller';
import { CustomerEkycService } from './ekyc.service';

@Module({
    imports: [
        // Lưu file vào RAM (buffer) thay vì disk — để forward thẳng qua Redis
        MulterModule.register({
            storage: memoryStorage(),
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        }),
    ],
    controllers: [CustomerEkycController],
    providers:   [CustomerEkycService],
    exports:     [CustomerEkycService],
})
export class EkycModule {}
