import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { OcrProvider } from '../interfaces/ocr-provider.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OcrSpaceProvider implements OcrProvider {
  private readonly logger = new Logger(OcrSpaceProvider.name);
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OCR_SPACE_API_KEY');
  }

  async extractNumberFromImage(url: string): Promise<number> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('OCR chưa được cấu hình. Vui lòng nhập chỉ số thủ công.');
    }
    
    this.logger.warn(`OCR provider is not integrated for image: ${url}`);
    throw new ServiceUnavailableException('OCR chưa sẵn sàng. Vui lòng nhập chỉ số thủ công.');
  }
}
