import { Injectable, Logger, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { OcrProvider } from '../interfaces/ocr-provider.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OcrSpaceProvider implements OcrProvider {
  private readonly logger = new Logger(OcrSpaceProvider.name);
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OCR_API_KEY') || this.configService.get<string>('OCR_SPACE_API_KEY');
  }

  async extractNumberFromImage(url: string): Promise<number> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('OCR chưa được cấu hình. Vui lòng nhập chỉ số thủ công.');
    }
    
    try {
      this.logger.log(`Processing OCR for URL: ${url}`);
      
      const searchParams = new URLSearchParams({
        apikey: this.apiKey,
        url: url,
        language: 'eng',
        ocrengine: '2', // Engine 2 is better for numbers and special chars
        scale: 'true', // Upscale image to improve accuracy
      });

      const response = await fetch(`https://api.ocr.space/parse/imageurl?${searchParams.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OCR API HTTP error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      if (data.IsErroredOnProcessing) {
        this.logger.error(`OCR API Error: ${data.ErrorMessage}`);
        throw new BadRequestException('Không thể đọc chỉ số từ ảnh này. Vui lòng thử lại hoặc nhập tay.');
      }

      if (!data.ParsedResults || data.ParsedResults.length === 0) {
        throw new BadRequestException('Không tìm thấy chữ số nào trong ảnh.');
      }

      const parsedText = data.ParsedResults[0].ParsedText || '';
      
      // Filter out non-numeric characters
      const match = parsedText.match(/\d+/);
      if (match) {
        return parseInt(match[0], 10);
      }

      throw new BadRequestException('Không tìm thấy chỉ số điện nước hợp lệ trong ảnh.');
    } catch (error: any) {
      this.logger.error('OCR Error', error.message || error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException('Lỗi hệ thống OCR. Vui lòng nhập chỉ số thủ công.');
    }
  }
}

