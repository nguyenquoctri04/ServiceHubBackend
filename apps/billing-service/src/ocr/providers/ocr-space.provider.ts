import { Injectable, Logger } from '@nestjs/common';
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
      this.logger.warn('OCR_SPACE_API_KEY is not configured. Mocking OCR result.');
      return 12345;
    }
    
    // In a real implementation, we would use axios to call the OCR.space API.
    // For now, we mock the result to avoid actual API calls in the demo, 
    // or you can implement the real HTTP call here.
    try {
      this.logger.log(`Calling OCR.Space API for image: ${url}`);
      // const response = await axios.post('https://api.ocr.space/parse/image', null, { params: { url, apikey: this.apiKey, language: 'eng', engine: 2 } });
      // const parsedText = response.data.ParsedResults?.[0]?.ParsedText || '';
      // const number = parseFloat(parsedText.replace(/[^0-9.]/g, ''));
      // return isNaN(number) ? 0 : number;

      // Mock
      return 12345;
    } catch (error) {
      this.logger.error(`OCR failed: ${error.message}`);
      throw new Error('OCR API failed');
    }
  }
}
