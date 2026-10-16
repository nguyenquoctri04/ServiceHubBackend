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
            placeOfOrigin: (doc as any).placeOfOrigin ?? (doc as any).place_of_origin ?? null,
            placeOfResidence: (doc as any).placeOfResidence ?? (doc as any).place_of_residence ?? null,
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
        phone: true,
        status: true,
        isEkycVerified: true,
        role: {
          select: {
            name: true,
          },
        },
        verifications: {
          where: { verifiedAt: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            documents: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { fullName: true },
            },
          },
        },
      },
    });

    return identities.map(({ verifications, role, ...identity }) => ({
      ...identity,
      fullName: verifications[0]?.documents[0]?.fullName ?? null,
      role: role?.name ?? null,
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

  async getIdentitiesBatch(identityIds: string[]) {
    if (!identityIds || identityIds.length === 0) return [];
    const uniqueIds = [...new Set(identityIds.filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    const identities = await this.prisma.identity.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        isEkycVerified: true,
        verifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            documents: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                fullName: true,
                documentNumber: true,
                dateOfBirth: true,
                gender: true,
                nationality: true,
                placeOfOrigin: true,
                placeOfResidence: true,
              },
            },
          },
        },
      },
    });

    return identities.map((id) => {
      const doc = id.verifications[0]?.documents[0];
      return {
        id: id.id,
        email: id.email,
        phone: id.phone,
        status: id.status,
        isEkycVerified: id.isEkycVerified,
        fullName: doc?.fullName || '',
        cccd: doc?.documentNumber || '',
        documentNumber: doc?.documentNumber || '',
        dateOfBirth: doc?.dateOfBirth ? doc.dateOfBirth.toISOString() : null,
        gender: doc?.gender || '',
        address: doc?.placeOfResidence || '',
        placeOfResidence: doc?.placeOfResidence || '',
        placeOfOrigin: doc?.placeOfOrigin || '',
        nationality: doc?.nationality || 'Việt Nam',
      };
    });
  }
}

