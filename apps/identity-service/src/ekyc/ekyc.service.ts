import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { VnptEkycService } from './vnpt-ekyc.service';
import { ExtractOcrDto } from './dto/extract-ocr.dto';
import { VerifyFaceDto } from './dto/verify-face.dto';
import { VerificationStatus } from '@prisma/client-identity';

@Injectable()
export class EkycService {
  private readonly logger = new Logger(EkycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vnptEkycService: VnptEkycService,
    private readonly configService: ConfigService,
  ) {}

  private parseDate(dateStr?: string): Date | null {
    if (!dateStr || dateStr === '-') return null;
    try {
      // Expected format dd/mm/yyyy
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const date = new Date(Date.UTC(year, month, day));
        if (!isNaN(date.getTime())) return date;
      }
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * Step 1: Upload front & back card images, call VNPT OCR API, store record in DB.
   */
  async extractOcr(dto: ExtractOcrDto) {
    this.logger.log(`Extracting OCR for identity: ${dto.identityId}`);

    const identity = await this.prisma.identity.findUnique({
      where: { id: dto.identityId },
    });

    if (!identity) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    const clientSession = `SESSION_${dto.identityId}_${Date.now()}`;

    // 1. Upload front image to VNPT to get frontHash
    const frontHash = await this.vnptEkycService.uploadFile(
      dto.frontImage,
      'cccd_front',
      `Front CCCD for ${dto.identityId}`
    );

    // 2. Upload back image to VNPT to get backHash
    const backHash = await this.vnptEkycService.uploadFile(
      dto.backImage,
      'cccd_back',
      `Back CCCD for ${dto.identityId}`
    );

    // 3. Call VNPT OCR API with synchronized clientSession
    const ocrData = await this.vnptEkycService.extractOcr(frontHash, backHash, clientSession);

    // 4. Parse dates
    const dob = this.parseDate(ocrData.birth_day);
    const issueDate = this.parseDate(ocrData.issue_date);
    const expiryDate = this.parseDate(ocrData.valid_date);

    // 5. Save to database
    const verification = await this.prisma.identityVerification.create({
      data: {
        identity: { connect: { id: dto.identityId } },
        provider: 'VNPT_EKYC',
        verificationLevel: 'LEVEL_1',
        status: VerificationStatus.PENDING,
        providerResponse: ocrData as any,
        createdAt: new Date(),
        documents: {
          create: {
            documentType: ocrData.card_type || 'CCCD',
            documentNumber: ocrData.id || null,
            fullName: ocrData.name || null,
            dateOfBirth: dob,
            gender: ocrData.gender || null,
            nationality: ocrData.nationality || null,
            placeOfOrigin: ocrData.origin_location || null,
            placeOfResidence: ocrData.recent_location || null,
            issueDate: issueDate,
            expiryDate: expiryDate,
            issuingAuthority: ocrData.issue_place || null,
            frontImageUrl: dto.frontImage,
            backImageUrl: dto.backImage,
            frontImageHash: frontHash,
            backImageHash: backHash,
            ocrRawData: ocrData as any,
            createdAt: new Date(),
          },
        },
      },
      include: {
        documents: true,
      },
    });

    return {
      success: true,
      verificationId: verification.id,
      document: verification.documents[0],
      ocrData: {
        documentNumber: ocrData.id,
        fullName: ocrData.name,
        dateOfBirth: ocrData.birth_day,
        gender: ocrData.gender,
        nationality: ocrData.nationality,
        placeOfOrigin: ocrData.origin_location,
        placeOfResidence: ocrData.recent_location,
        issueDate: ocrData.issue_date,
        issuingAuthority: ocrData.issue_place,
        cardType: ocrData.card_type,
      },
    };
  }

  /**
   * Step 2: Compare selfie face image with stored CCCD front card image.
   */
  async verifyFace(dto: VerifyFaceDto) {
    this.logger.log(`Verifying face for verificationId: ${dto.verificationId}, identityId: ${dto.identityId}`);

    const identity = await this.prisma.identity.findUnique({
      where: { id: dto.identityId },
    });

    if (!identity) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    const verification = await this.prisma.identityVerification.findUnique({
      where: { id: dto.verificationId },
      include: { documents: true },
    });

    if (!verification || verification.identityId !== dto.identityId) {
      throw new NotFoundException('Không tìm thấy hồ sơ xác thực eKYC');
    }

    const document = verification.documents[0];
    if (!document) {
      throw new BadRequestException('Hồ sơ xác thực chưa có thông tin giấy tờ');
    }

    // Determine front card image hash
    let frontHash = document.frontImageHash;
    if (!frontHash) {
      if (!document.frontImageUrl) {
        throw new BadRequestException('Thiếu ảnh CCCD mặt trước để xác thực khuôn mặt');
      }
      frontHash = await this.vnptEkycService.uploadFile(
        document.frontImageUrl,
        'cccd_front',
        `Front CCCD for ${dto.identityId}`
      );
    }

    // Upload selfie image to VNPT
    const selfieHash = await this.vnptEkycService.uploadFile(
      dto.selfieImage,
      'selfie_face',
      `Selfie for ${dto.identityId}`
    );

    // Call VNPT Face Compare API
    const matchResult = await this.vnptEkycService.compareFace(frontHash, selfieHash);

    const thresholdStr = this.configService.get<string>('VNPT_EKYC_FACE_MATCH_THRESHOLD', '80.0');
    const threshold = parseFloat(thresholdStr);
    const prob = matchResult.prob ?? 0;
    const isMatch = matchResult.msg === 'MATCH' || prob >= threshold;

    if (isMatch) {
      // Update verification status -> VERIFIED
      await this.prisma.identityVerification.update({
        where: { id: dto.verificationId },
        data: {
          status: VerificationStatus.VERIFIED,
          faceSimilarity: prob,
          verifiedAt: new Date(),
        },
      });

      // Update Identity -> isEkycVerified = true
      await this.prisma.identity.update({
        where: { id: dto.identityId },
        data: { isEkycVerified: true },
      });

      // Save selfie image URL if provided
      await this.prisma.identityDocument.update({
        where: { id: document.id },
        data: { selfieImageUrl: dto.selfieImage },
      });

      return {
        success: true,
        verified: true,
        similarityScore: prob,
        message: 'Xác thực eKYC thành công!',
      };
    } else {
      // Update verification status -> REJECTED
      await this.prisma.identityVerification.update({
        where: { id: dto.verificationId },
        data: {
          status: VerificationStatus.REJECTED,
          faceSimilarity: prob,
          failureReason: matchResult.result || 'Khuôn mặt không trùng khớp với ảnh trên CCCD',
        },
      });

      return {
        success: false,
        verified: false,
        similarityScore: prob,
        message: matchResult.result || 'Khuôn mặt không trùng khớp với ảnh trên CCCD',
      };
    }
  }
}
