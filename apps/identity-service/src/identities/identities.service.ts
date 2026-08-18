import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { IdentityStatus } from '@prisma/client-identity';
import { NotificationTargetTypeValue } from '@app/common';

@Injectable()
export class IdentitiesService {
  private readonly logger = new Logger(IdentitiesService.name);

  constructor(private readonly prisma: PrismaService) { }

  async getProfile(id: string) {
    this.logger.log(`Fetching profile for identity: ${id}`);

    const identity = await this.prisma.identity.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        },
      }
    });

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    // Omit sensitive data
    const { passwordHash, ...safeIdentity } = identity;
    return safeIdentity;
  }

  /**
   * Get identity with latest IdentityDocument (from eKYC).
   * Used by customer Settings page to show real personal info.
   */
  async getMyProfile(id: string) {
    this.logger.log(`Fetching my profile with document for identity: ${id}`);

    const identity = await this.prisma.identity.findUnique({ where: { id } });
    if (!identity) throw new NotFoundException('Identity not found');

    // Get the most recent VERIFIED verification first, fallback to latest any
    const verification = await this.prisma.identityVerification.findFirst({
      where: { identityId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        documents: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const doc = verification?.documents?.[0] ?? null;
    const { passwordHash, ...safe } = identity;

    return {
      ...safe,
      verificationStatus: verification?.status ?? null,
      verifiedAt: verification?.verifiedAt ?? null,
      faceSimilarity: verification?.faceSimilarity ?? null,
      document: doc
        ? {
            id: doc.id,
            documentType: doc.documentType,
            documentNumber: doc.documentNumber,
            fullName: doc.fullName,
            dateOfBirth: doc.dateOfBirth,
            gender: doc.gender,
            nationality: doc.nationality,
            placeOfOrigin: doc.placeOfOrigin,
            placeOfResidence: doc.placeOfResidence,
            issueDate: doc.issueDate,
            expiryDate: doc.expiryDate,
            issuingAuthority: doc.issuingAuthority,
          }
        : null,
    };
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    this.logger.log(`Updating profile for identity: ${id}`);

    // Ensure exists
    await this.getProfile(id);

    const updated = await this.prisma.identity.update({
      where: { id },
      data: {
        status: dto.status ? (dto.status as IdentityStatus) : undefined,
      },
    });

    const { passwordHash, ...safeIdentity } = updated;
    return safeIdentity;
  }

  async resolveNotificationRecipients(payload: {
    targetType: NotificationTargetTypeValue;
    targetRole?: string;
    recipientIds?: string[];
  }) {
    const where = this.buildNotificationRecipientWhere(payload);

    const identities = await this.prisma.identity.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    return identities.map((identity) => ({
      id: identity.id,
      email: identity.email,
      role: identity.role.name,
    }));
  }

  private buildNotificationRecipientWhere(payload: {
    targetType: NotificationTargetTypeValue;
    targetRole?: string;
    recipientIds?: string[];
  }) {
    if (payload.targetType === NotificationTargetTypeValue.ALL) {
      return {};
    }

    if (payload.targetType === NotificationTargetTypeValue.ROLE && payload.targetRole) {
      const roleStr = payload.targetRole;
      return {
        role: {
          name: {
            in: [roleStr, roleStr.toLowerCase(), roleStr.toUpperCase()],
          },
        },
      };
    }

    return {
      id: {
        in: payload.recipientIds || [],
      },
    };
  }
}
