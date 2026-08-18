import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { OcrProvider } from './interfaces/ocr-provider.interface';

@Injectable()
export class OcrService {
  constructor(
    @Inject('OcrProvider') private readonly ocrProvider: OcrProvider,
  ) {}

  async processImage(url: string): Promise<number> {
    this.assertSafeRemoteImageUrl(url);
    return this.ocrProvider.extractNumberFromImage(url);
  }

  private assertSafeRemoteImageUrl(value: string) {
    let url: URL;
    try { url = new URL(value); } catch { throw new BadRequestException('URL ảnh không hợp lệ.'); }
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new BadRequestException('Chỉ chấp nhận URL HTTPS công khai.');
    }
    const host = url.hostname.toLowerCase();
    const isPrivateIpv4 = /^(127|10)\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || /^169\.254\./.test(host);
    if (host === 'localhost' || host === '::1' || host.endsWith('.local') || isPrivateIpv4) {
      throw new BadRequestException('URL ảnh không được trỏ đến mạng nội bộ.');
    }
  }
}
