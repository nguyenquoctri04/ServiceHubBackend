import { Injectable, Inject } from '@nestjs/common';
import { OcrProvider } from './interfaces/ocr-provider.interface';

@Injectable()
export class OcrService {
  constructor(
    @Inject('OcrProvider') private readonly ocrProvider: OcrProvider,
  ) {}

  async processImage(url: string): Promise<number> {
    return this.ocrProvider.extractNumberFromImage(url);
  }
}
