import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';

@Injectable()
export class EkycService {
  private readonly logger = new Logger(EkycService.name);

  constructor(private readonly prisma: PrismaService) {}

  async submitVerification(dto: SubmitVerificationDto) {
    this.logger.log(`Submitting eKYC verification for identity: ${dto.identityId}`);
    
    const identity = await this.prisma.identity.findUnique({
      where: { id: dto.identityId },
    });

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    // Example logic to store verification attempt
    const verification = await this.prisma.identityVerification.create({
      data: {
        identity: { connect: { id: dto.identityId } },
        provider: dto.provider,
        verificationLevel: 'LEVEL_1',
        createdAt: new Date(),
        documents: {
          create: {
            documentType: dto.documents.documentType,
            frontImageUrl: dto.documents.frontImageUrl,
            backImageUrl: dto.documents.backImageUrl,
            selfieImageUrl: dto.documents.selfieImageUrl,
            createdAt: new Date(),
          }
        }
      },
      include: {
        documents: true,
      }
    });

    // In a real system, here we would call the 3rd party eKYC provider (like VNPT or FPT.AI)
    // For now, we mock success.
    
    await this.prisma.identity.update({
      where: { id: dto.identityId },
      data: { isEkycVerified: true }
    });

    return {
      success: true,
      verificationId: verification.id,
      message: 'eKYC verification submitted and processed successfully',
    };
  }
}
