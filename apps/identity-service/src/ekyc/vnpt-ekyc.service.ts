import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VnptOcrResponse {
  id?: string;
  name?: string;
  birth_day?: string;
  gender?: string;
  nationality?: string;
  origin_location?: string;
  recent_location?: string;
  issue_date?: string;
  valid_date?: string;
  issue_place?: string;
  card_type?: string;
  tampering?: {
    is_legal?: string;
    warning?: string[];
  };
  id_fake_warning?: string;
  [key: string]: any;
}

export interface VnptFaceCompareResponse {
  result?: string;
  msg?: string; // "MATCH" | "NOMATCH"
  prob?: number; // e.g. 99.33
  server_version?: string;
  [key: string]: any;
}

@Injectable()
export class VnptEkycService {
  private readonly logger = new Logger(VnptEkycService.name);

  constructor(private readonly configService: ConfigService) {}

  private get baseUrl(): string {
    return this.configService.get<string>('VNPT_EKYC_BASE_URL', 'https://api.idg.vnpt.vn');
  }

  private get accessToken(): string {
    return this.configService.get<string>('VNPT_EKYC_ACCESS_TOKEN', '');
  }

  private get tokenId(): string {
    return this.configService.get<string>('VNPT_EKYC_TOKEN_ID', '');
  }

  private get tokenKey(): string {
    return this.configService.get<string>('VNPT_EKYC_TOKEN_KEY', '');
  }

  /** Build auth headers – use node-fetch which preserves header casing */
  private buildAuthHeaders(): Record<string, string> {
    let token = this.accessToken.trim();
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }
    const tokenId = this.tokenId.trim();
    const tokenKey = this.tokenKey.trim();

    if (!token || !tokenId || !tokenKey) {
      throw new BadRequestException(
        'Thiếu cấu hình VNPT eKYC trong .env: VNPT_EKYC_ACCESS_TOKEN / VNPT_EKYC_TOKEN_ID / VNPT_EKYC_TOKEN_KEY',
      );
    }

    this.logger.debug(
      `Auth headers: Authorization=Bearer ***${token.slice(-6)}, Token-id=${tokenId.slice(0, 8)}..., Token-key=${tokenKey.slice(0, 8)}...`,
    );

    // Header names must match VNPT IDG documentation exactly:
    // Token-id (lowercase 'd'), Token-key, mac-address: TEST1
    return {
      'Authorization': `Bearer ${token}`,
      'Token-id': tokenId,
      'Token-key': tokenKey,
      'mac-address': 'TEST1',
    };
  }

  private translateVnptError(codeOrMsg: string): string {
    if (!codeOrMsg) return 'Lỗi không xác định từ dịch vụ VNPT eKYC';
    if (codeOrMsg.includes('IDG-00000404')) {
      return 'Ảnh tải lên không thể nhận diện được. Vui lòng thử lại với ảnh CCCD rõ nét hơn.';
    }
    if (codeOrMsg.includes('IDG-00000401') || codeOrMsg.toLowerCase().includes('token')) {
      return 'Xác thực VNPT eKYC thất bại – kiểm tra VNPT_EKYC_ACCESS_TOKEN / TOKEN_ID / TOKEN_KEY trong .env';
    }
    if (codeOrMsg.includes('IDG-00000400')) {
      return 'Tham số gửi tới VNPT không hợp lệ. Vui lòng kiểm tra lại ảnh.';
    }
    if (codeOrMsg.includes('IDG-00010445')) {
      return 'Giấy tờ không hợp lệ hoặc ảnh CCCD không đạt yêu cầu. Vui lòng chụp lại ảnh CCCD rõ nét, đúng góc độ, không bị che khuất.';
    }
    if (codeOrMsg.includes('IDG-00010')) {
      return `Ảnh CCCD không đạt yêu cầu nhận diện (${codeOrMsg}). Vui lòng chụp lại ảnh rõ nét hơn.`;
    }
    return codeOrMsg;
  }

  private async readResponseJson(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return {
        message: text,
      };
    }
  }

  private async imageToBuffer(base64OrUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const image = base64OrUrl?.trim();
    if (!image) {
      throw new Error('Thiếu dữ liệu ảnh');
    }

    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([A-Za-z0-9+/\-.]+);base64,(.+)$/);
      const mimeType = matches?.[1] || 'image/jpeg';
      const base64 = matches?.[2] || image.split(',')[1];

      if (!base64) {
        throw new Error('Dữ liệu ảnh base64 không hợp lệ');
      }

      return {
        buffer: Buffer.from(base64, 'base64'),
        mimeType,
      };
    }

    if (image.startsWith('http://') || image.startsWith('https://')) {
      const resp = await fetch(image);
      if (!resp.ok) {
        throw new Error(`Không tải được ảnh từ URL (${resp.status})`);
      }

      return {
        buffer: Buffer.from(await resp.arrayBuffer()),
        mimeType: resp.headers.get('content-type') || 'image/jpeg',
      };
    }

    return {
      buffer: Buffer.from(image, 'base64'),
      mimeType: 'image/jpeg',
    };
  }

  /**
   * Upload image to VNPT file-service to obtain a hash.
   * Uses form-data + node-fetch to ensure reliable multipart upload.
   */
  async uploadFile(
    base64OrUrl: string,
    title: string = 'ekyc_image',
    description: string = 'ekyc file',
  ): Promise<string> {
    try {
      this.logger.log(`Uploading image to VNPT IDG (title: ${title})...`);

      const { buffer, mimeType } = await this.imageToBuffer(base64OrUrl);
      const filename = `${title}_${Date.now()}.jpg`;

      if (!buffer.length) {
        throw new Error('File ảnh rỗng hoặc không đọc được dữ liệu ảnh');
      }

      this.logger.log(`Image buffer size: ${buffer.length} bytes`);

      const blobPart = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;
      const form = new FormData();
      form.append('file', new Blob([blobPart], { type: mimeType }), filename);
      form.append('title', title);
      form.append('description', description);

      const url = `${this.baseUrl}/file-service/v1/addFile`;
      const authHeaders = this.buildAuthHeaders();

      const response = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: form,
      });

      const data = await this.readResponseJson(response);
      this.logger.log(`VNPT uploadFile response: ${JSON.stringify(data)}`);

      if (data?.object?.hash) {
        const hash = data.object.hash as string;
        this.logger.log(`Got hash (${title}): ${hash.substring(0, 30)}...`);
        return hash;
      }

      const rawErr = data?.message || data?.errors?.[0] || `Upload thất bại (${response.status})`;
      throw new Error(this.translateVnptError(rawErr));
    } catch (error: any) {
      this.logger.error(`VNPT uploadFile error: ${error.message}`);
      throw new BadRequestException(this.translateVnptError(error.message));
    }
  }

  /**
   * Call VNPT OCR API to extract ID card information.
   * Strategy: try -1 (auto-detect) first, then 1 (CCCD chip), then 0 (old CMND).
   * Retryable errors: IDG-00000404 (image not recognized), IDG-00010445 (wrong card type guess).
   * Non-retryable: auth errors (IDG-00000401), bad param errors that are not type-related.
   */
  async extractOcr(frontHash: string, backHash: string, clientSession?: string): Promise<VnptOcrResponse> {
    const session = clientSession || `SESSION_${Date.now()}`;
    const url = `${this.baseUrl}/ai/v1/ocr/id`;
    const authHeaders = this.buildAuthHeaders();

    let lastError: string = 'Lỗi trích xuất OCR từ VNPT';
    let lastErrorDetail: string = '';

    // Try auto-detect first, then explicit chip CCCD, then old CMND
    // -1 = auto, 1 = CCCD chip (new), 0 = old CMND
    for (const cardType of [-1, 1, 0]) {
      try {
        this.logger.log(`VNPT OCR request (type=${cardType}, session=${session.substring(0, 30)}...)`);

        const payload = {
          img_front: frontHash,
          img_back: backHash,
          client_session: session,
          type: cardType,
          validate_postcode: true,
          token: session,
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await this.readResponseJson(response);
        this.logger.log(`VNPT OCR response (type=${cardType}): ${JSON.stringify(data)}`);

        // Success: VNPT returns data.object with OCR result
        if (data?.object && data.message === 'IDG-00000000') {
          return data.object as VnptOcrResponse;
        }

        // Collect the most descriptive error string available
        const msgCode = (data?.message || '') as string;
        const errDetail = (data?.errors?.[0] || data?.error || '') as string;
        lastError = msgCode || errDetail || `OCR thất bại (HTTP ${response.status})`;
        lastErrorDetail = errDetail;

        this.logger.warn(
          `VNPT OCR type=${cardType} failed: ${msgCode} — ${errDetail}`,
        );

        // Non-retryable: auth failure → stop immediately
        if (msgCode.includes('IDG-00000401') || msgCode.toLowerCase().includes('unauthorized')) {
          break;
        }

        // Retryable errors: wrong card type guess or image not recognized → try next type
        // IDG-00010445 = wrong document type, IDG-00000404 = image not readable
        const isRetryable =
          msgCode.includes('IDG-00010445') ||
          msgCode.includes('IDG-00000404') ||
          errDetail.toLowerCase().includes('loại giấy tờ') ||
          errDetail.toLowerCase().includes('không hợp lệ');

        if (!isRetryable) {
          break;
        }
      } catch (err: any) {
        lastError = err.message;
        this.logger.error(`VNPT OCR type=${cardType} threw exception: ${err.message}`);
      }
    }

    const finalMsg = lastErrorDetail
      ? `${lastError} — ${lastErrorDetail}`
      : lastError;
    this.logger.error(`VNPT OCR all card types failed. Last error: ${finalMsg}`);
    throw new BadRequestException(this.translateVnptError(lastError));
  }

  /**
   * Compare selfie face with front card face.
   */
  async compareFace(frontHash: string, selfieHash: string, clientSession?: string): Promise<VnptFaceCompareResponse> {
    try {
      const session = clientSession || `SESSION_${Date.now()}`;
      const url = `${this.baseUrl}/ai/v1/face/compare`;
      const authHeaders = this.buildAuthHeaders();

      const payload = {
        img_front: frontHash,
        img_face: selfieHash,
        client_session: session,
        token: session,
      };

      this.logger.log(`VNPT Face Compare request (session=${session.substring(0, 30)}...):`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await this.readResponseJson(response);
      this.logger.log(`VNPT Face Compare response: ${JSON.stringify(data)}`);

      if (data?.object) {
        return data.object as VnptFaceCompareResponse;
      }

      const rawErr = (data?.message || data?.error || data?.errors?.[0] || `Face compare thất bại (${response.status})`) as string;
      throw new Error(this.translateVnptError(rawErr));
    } catch (error: any) {
      this.logger.error(`VNPT compareFace error: ${error.message}`);
      throw new BadRequestException(this.translateVnptError(error.message));
    }
  }
}
