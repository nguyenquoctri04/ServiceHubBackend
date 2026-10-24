import {
    BadRequestException,
    Controller,
    Post,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CUSTOMER_EKYC, CUSTOMER_IDENTITY_ENDPOINT } from '@app/common/constants/customer.endpoint';
import { CurrentUser, JwtAuthGuard } from '@app/common';
import { CustomerEkycService } from './ekyc.service';

interface UploadedEkycFiles {
    front_image?:  Express.Multer.File[];
    selfie_image?: Express.Multer.File[];
}

@Controller(CUSTOMER_EKYC)
export class CustomerEkycController {
    constructor(private readonly service: CustomerEkycService) {}

    /**
     * POST /api/customer/identity/ekyc/submit
     * Body: multipart/form-data
     *   - front_image  (required) — ảnh mặt trước CCCD
     *   - selfie_image (required) — ảnh selfie của user
     */
    @Post(CUSTOMER_IDENTITY_ENDPOINT.SUBMIT_EKYC)
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'front_image',  maxCount: 1 },
            { name: 'selfie_image', maxCount: 1 },
        ]),
    )
    async submitVerification(
        @CurrentUser('id') identityId: string,
        @UploadedFiles() files: UploadedEkycFiles,
    ) {
        const frontFile  = files?.front_image?.[0];
        const selfieFile = files?.selfie_image?.[0];

        if (!frontFile) {
            throw new BadRequestException('Thiếu ảnh mặt trước CCCD (front_image)');
        }
        if (!selfieFile) {
            throw new BadRequestException('Thiếu ảnh selfie (selfie_image)');
        }

        // Giới hạn kích thước: 5MB mỗi file
        const MAX_SIZE = 5 * 1024 * 1024;
        if (frontFile.size > MAX_SIZE || selfieFile.size > MAX_SIZE) {
            throw new BadRequestException('Kích thước ảnh tối đa 5MB');
        }

        return this.service.submitVerification(
            identityId,
            frontFile.buffer,
            selfieFile.buffer,
        );
    }

    /**
     * POST /api/customer/identity/ekyc/ocr
     * Bước 1: Upload CCCD → OCR trích xuất thông tin (không lưu DB)
     */
    @Post(CUSTOMER_IDENTITY_ENDPOINT.OCR)
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'front_image', maxCount: 1 },
        ]),
    )
    async ocrCccd(
        @CurrentUser('id') identityId: string,
        @UploadedFiles() files: { front_image?: Express.Multer.File[] },
    ) {
        const frontFile = files?.front_image?.[0];
        if (!frontFile) {
            throw new BadRequestException('Thiếu ảnh mặt trước CCCD (front_image)');
        }
        const MAX_SIZE = 5 * 1024 * 1024;
        if (frontFile.size > MAX_SIZE) {
            throw new BadRequestException('Kích thước ảnh tối đa 5MB');
        }
        return this.service.ocrCccd(identityId, frontFile.buffer);
    }

    /**
     * POST /api/customer/identity/ekyc/verify-face
     * Bước 2: Upload selfie → so khớp khuôn mặt → lưu DB nếu match
     */
    @Post(CUSTOMER_IDENTITY_ENDPOINT.VERIFY_FACE)
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'front_image', maxCount: 1 },
            { name: 'selfie_image', maxCount: 1 },
        ]),
    )
    async verifyFace(
        @CurrentUser('id') identityId: string,
        @UploadedFiles() files: { front_image?: Express.Multer.File[]; selfie_image?: Express.Multer.File[] },
    ) {
        const frontFile = files?.front_image?.[0];
        const selfieFile = files?.selfie_image?.[0];

        if (!frontFile) {
            throw new BadRequestException('Thiếu ảnh mặt trước CCCD (front_image)');
        }
        if (!selfieFile) {
            throw new BadRequestException('Thiếu ảnh selfie (selfie_image)');
        }
        const MAX_SIZE = 5 * 1024 * 1024;
        if (frontFile.size > MAX_SIZE || selfieFile.size > MAX_SIZE) {
            throw new BadRequestException('Kích thước ảnh tối đa 5MB');
        }
        return this.service.verifyFace(identityId, frontFile.buffer, selfieFile.buffer);
    }
}
