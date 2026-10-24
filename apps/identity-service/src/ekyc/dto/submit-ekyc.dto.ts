import { Allow } from 'class-validator';

/**
 * DTO nhận từ API Gateway qua Redis RPC.
 * Ảnh được truyền dưới dạng Buffer (serialize JSON → base64 tự động qua Redis).
 */
export class SubmitEkycDto {
    /** UUID của Identity đang xác thực */
    @Allow()
    identityId: string;

    /** Buffer bytes của ảnh mặt trước CCCD */
    @Allow()
    frontImageBuffer: Buffer;

    /** Buffer bytes của ảnh selfie */
    @Allow()
    selfieImageBuffer: Buffer;

    /** URL Cloudinary đã upload (để lưu vào DB, optional) */
    @Allow()
    frontImageUrl?: string;

    /** URL Cloudinary đã upload (để lưu vào DB, optional) */
    @Allow()
    selfieImageUrl?: string;
}

/** DTO cho bước 1 — chỉ upload CCCD để OCR */
export class OcrDto {
    @Allow()
    identityId: string;

    @Allow()
    frontImageBuffer: Buffer;
}

/** DTO cho bước 2 — upload CCCD + selfie để so khớp khuôn mặt */
export class VerifyFaceDto {
    @Allow()
    identityId: string;

    @Allow()
    frontImageBuffer: Buffer;

    @Allow()
    selfieImageBuffer: Buffer;
}
