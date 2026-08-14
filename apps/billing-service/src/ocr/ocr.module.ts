import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { OcrSpaceProvider } from './providers/ocr-space.provider';

@Module({
  providers: [
    OcrService,
    {
      provide: 'OcrProvider',
      useClass: OcrSpaceProvider,
    },
  ],
  exports: [OcrService],
})
export class OcrModule {}
