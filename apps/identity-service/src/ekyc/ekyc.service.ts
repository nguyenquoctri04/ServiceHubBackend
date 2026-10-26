import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitEkycDto, OcrDto, VerifyFaceDto } from './dto/submit-ekyc.dto';

/** Response trả về từ Python FastAPI /ekyc/ocr */
interface AiOcrResponse {
    success: boolean;
    ocr_info?: {
        card_id: string;
        full_name: string;
        date_of_birth: string;
        gender: string;
        nationality: string;
        place_of_origin: string;
        place_of_residence: string;
    };
    error_code?: string;
    error_message?: string;
}

/** Response trả về từ Python FastAPI /ekyc/verify-face */
interface AiVerifyResponse {
    success: boolean;
    face_matched: boolean;
    face_similarity: number;
    ocr_info?: {
        card_id: string;
        full_name: string;
        date_of_birth: string;
        gender: string;
        nationality: string;
        place_of_origin: string;
        place_of_residence: string;
    };
    error_code?: string;
    error_message?: string;
}

@Injectable()
export class EkycService {
    private readonly logger = new Logger(EkycService.name);
    private readonly aiServiceUrl: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
        private readonly config: ConfigService,
    ) {
        this.aiServiceUrl =
            this.config.get<string>('EKYC_AI_SERVICE_URL') ??
            'http://localhost:8000';
    }

    async submitVerification(dto: SubmitEkycDto) {
        this.logger.log(`eKYC submit for identity: ${dto.identityId}`);

        // 1. Kiểm tra identity tồn tại
        const identity = await this.prisma.identity.findUnique({
            where: { id: dto.identityId },
        });
        if (!identity) {
            throw new NotFoundException('Tài khoản không tồn tại');
        }
        if (identity.isEkycVerified) {
            throw new BadRequestException('Tài khoản đã được xác thực eKYC trước đó');
        }

        // 2. Gọi Python AI service với ảnh dạng buffer
        const aiResult = await this.callAiService(dto.frontImageBuffer, dto.selfieImageBuffer);

        // 3. Tạo bản ghi xác thực trong DB
        const verification = await this.prisma.identityVerification.create({
            data: {
                identity:          { connect: { id: dto.identityId } },
                provider:          'INTERNAL_AI',
                verificationLevel: 'LEVEL_1',
                faceSimilarity:    aiResult.face_similarity,
                livenessScore:     null,
                providerResponse:  aiResult as any,
                status:            aiResult.success && aiResult.face_matched ? 'VERIFIED' : 'REJECTED',
                failureReason:     this.buildFailureReason(aiResult),
                verifiedAt:        aiResult.success && aiResult.face_matched ? new Date() : null,
                // Hết hạn sau 1 năm nếu verify thành công
                expiredAt:         aiResult.success && aiResult.face_matched
                    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    : null,
                createdAt:         new Date(),
                documents: {
                    create: {
                        documentType:       'CCCD',
                        documentNumber:     aiResult.ocr_info?.card_id      ?? null,
                        fullName:           aiResult.ocr_info?.full_name     ?? null,
                        dateOfBirth:        this.parseDate(aiResult.ocr_info?.date_of_birth),
                        gender:             aiResult.ocr_info?.gender        ?? null,
                        nationality:        aiResult.ocr_info?.nationality   ?? null,
                        place_of_origin:    aiResult.ocr_info?.place_of_origin    ?? null,
                        place_of_residence: aiResult.ocr_info?.place_of_residence ?? null,
                        frontImageUrl:      dto.frontImageUrl  ?? null,
                        selfieImageUrl:     dto.selfieImageUrl ?? null,
                        ocrRawData:         aiResult.ocr_info as any ?? null,
                        createdAt:          new Date(),
                    },
                },
            },
        });

        // 4. Nếu pass → cập nhật isEkycVerified = true
        if (aiResult.success && aiResult.face_matched) {
            await this.prisma.identity.update({
                where: { id: dto.identityId },
                data:  { isEkycVerified: true },
            });

            this.logger.log(`eKYC PASSED for identity: ${dto.identityId}, similarity: ${aiResult.face_similarity}`);

            return {
                success:        true,
                verificationId: verification.id,
                faceSimilarity: aiResult.face_similarity,
                message:        'Xác thực eKYC thành công',
            };
        }

        // 5. Nếu fail → trả thông báo rõ lý do
        this.logger.warn(`eKYC FAILED for identity: ${dto.identityId}, reason: ${aiResult.error_code ?? 'FACE_NOT_MATCHED'}`);

        return {
            success:        false,
            verificationId: verification.id,
            faceSimilarity: aiResult.face_similarity,
            errorCode:      aiResult.error_code ?? 'FACE_NOT_MATCHED',
            message:        aiResult.error_message ?? 'Khuôn mặt không khớp với ảnh trên CCCD',
        };
    }

    // --------------------------------------------------------------------------
    // Private helpers
    // --------------------------------------------------------------------------

    /** Gọi Python FastAPI với hai file ảnh dạng Buffer */
    private async callAiService(
        frontBuffer: Buffer,
        selfieBuffer: Buffer,
        endpoint: string = '/ekyc/verify',
    ): Promise<AiVerifyResponse> {
        const form = new FormData();
        form.append('front_image',  frontBuffer,  { filename: 'front.jpg',  contentType: 'image/jpeg' });
        form.append('selfie_image', selfieBuffer, { filename: 'selfie.jpg', contentType: 'image/jpeg' });

        try {
            const response = await firstValueFrom(
                this.httpService.post<AiVerifyResponse>(
                    `${this.aiServiceUrl}${endpoint}`,
                    form,
                    {
                        headers: form.getHeaders(),
                        timeout: 60_000,
                    },
                ),
            );
            return response.data;
        } catch (err: any) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail ?? err?.message ?? 'Unknown error';
            this.logger.error(`AI service error [${status}]: ${detail}`);

            if (!status || status >= 500) {
                throw new ServiceUnavailableException('AI service không phản hồi, vui lòng thử lại sau');
            }

            throw new BadRequestException(detail);
        }
    }

    /** Gọi Python FastAPI /ekyc/ocr với chỉ ảnh CCCD */
    private async callAiOcr(frontBuffer: Buffer): Promise<AiOcrResponse> {
        const form = new FormData();
        form.append('front_image', frontBuffer, { filename: 'front.jpg', contentType: 'image/jpeg' });

        try {
            const response = await firstValueFrom(
                this.httpService.post<AiOcrResponse>(
                    `${this.aiServiceUrl}/ekyc/ocr`,
                    form,
                    {
                        headers: form.getHeaders(),
                        timeout: 60_000,
                    },
                ),
            );
            return response.data;
        } catch (err: any) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail ?? err?.message ?? 'Unknown error';
            this.logger.error(`AI OCR service error [${status}]: ${detail}`);

            if (!status || status >= 500) {
                throw new ServiceUnavailableException('AI service không phản hồi, vui lòng thử lại sau');
            }

            throw new BadRequestException(detail);
        }
    }

    /** Bước 1: OCR CCCD — chỉ trích xuất thông tin, KHÔNG lưu DB */
    async ocrCccd(dto: OcrDto) {
        this.logger.log(`eKYC OCR for identity: ${dto.identityId}`);

        // Kiểm tra identity tồn tại
        const identity = await this.prisma.identity.findUnique({
            where: { id: dto.identityId },
        });
        if (!identity) {
            throw new NotFoundException('Tài khoản không tồn tại');
        }

        const aiResult = await this.callAiOcr(dto.frontImageBuffer);

        if (!aiResult.success) {
            this.logger.warn(`eKYC OCR FAILED for identity: ${dto.identityId}, reason: ${aiResult.error_code}`);
            return {
                success: false,
                error_code: aiResult.error_code,
                error_message: aiResult.error_message ?? 'Không thể đọc thông tin CCCD',
            };
        }

        this.logger.log(`eKYC OCR OK for identity: ${dto.identityId}, card_id: ${aiResult.ocr_info?.card_id}`);

        return {
            success: true,
            ocr_info: aiResult.ocr_info,
        };
    }

    /** Bước 2: So khớp khuôn mặt — lưu DB nếu match, KHÔNG lưu nếu fail */
    async verifyFace(dto: VerifyFaceDto) {
        this.logger.log(`eKYC verify-face for identity: ${dto.identityId}`);

        // 1. Kiểm tra identity tồn tại
        const identity = await this.prisma.identity.findUnique({
            where: { id: dto.identityId },
        });
        if (!identity) {
            throw new NotFoundException('Tài khoản không tồn tại');
        }
        if (identity.isEkycVerified) {
            throw new BadRequestException('Tài khoản đã được xác thực eKYC trước đó');
        }

        // 2. Gọi Python AI service /ekyc/verify-face
        const aiResult = await this.callAiService(
            dto.frontImageBuffer,
            dto.selfieImageBuffer,
            '/ekyc/verify-face',
        );

        // 3. Nếu face match → lưu DB + set isEkycVerified = true
        if (aiResult.success && aiResult.face_matched) {
            const verification = await this.prisma.identityVerification.create({
                data: {
                    identity:          { connect: { id: dto.identityId } },
                    provider:          'INTERNAL_AI',
                    verificationLevel: 'LEVEL_1',
                    faceSimilarity:    aiResult.face_similarity,
                    livenessScore:     null,
                    providerResponse:  aiResult as any,
                    status:            'VERIFIED',
                    failureReason:     null,
                    verifiedAt:        new Date(),
                    expiredAt:         new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    createdAt:         new Date(),
                    documents: {
                        create: {
                            documentType:       'CCCD',
                            documentNumber:     aiResult.ocr_info?.card_id      ?? null,
                            fullName:           aiResult.ocr_info?.full_name     ?? null,
                            dateOfBirth:        this.parseDate(aiResult.ocr_info?.date_of_birth),
                            gender:             aiResult.ocr_info?.gender        ?? null,
                            nationality:        aiResult.ocr_info?.nationality   ?? null,
                            place_of_origin:    aiResult.ocr_info?.place_of_origin    ?? null,
                            place_of_residence: aiResult.ocr_info?.place_of_residence ?? null,
                            ocrRawData:         aiResult.ocr_info as any ?? null,
                            createdAt:          new Date(),
                        },
                    },
                },
            });

            await this.prisma.identity.update({
                where: { id: dto.identityId },
                data:  { isEkycVerified: true },
            });

            this.logger.log(`eKYC PASSED for identity: ${dto.identityId}, similarity: ${aiResult.face_similarity}`);

            return {
                success:        true,
                verificationId: verification.id,
                faceSimilarity: aiResult.face_similarity,
                message:        'Xác thực eKYC thành công',
            };
        }

        // 4. Nếu face không match → KHÔNG lưu DB, trả về failure
        this.logger.warn(`eKYC FACE NOT MATCHED for identity: ${dto.identityId}, similarity: ${aiResult.face_similarity}`);

        return {
            success:        false,
            faceSimilarity: aiResult.face_similarity,
            errorCode:      aiResult.error_code ?? 'FACE_NOT_MATCHED',
            message:        aiResult.error_message ?? 'Khuôn mặt không khớp với ảnh trên CCCD',
        };
    }

    /** Parse "DD/MM/YYYY" → Date | null */
    private parseDate(dateStr?: string): Date | null {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;
        const [day, month, year] = parts.map(Number);
        if (!day || !month || !year) return null;
        return new Date(year, month - 1, day);
    }

    /** Tổng hợp lý do thất bại thành 1 chuỗi */
    private buildFailureReason(result: AiVerifyResponse): string | null {
        if (result.success && result.face_matched) return null;
        if (result.error_message) return result.error_message;
        if (!result.face_matched) return 'Khuôn mặt không khớp với ảnh CCCD';
        return 'Xác thực thất bại';
    }
}
