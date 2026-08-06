import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class IdentitiesService {
  private readonly logger = new Logger(IdentitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(id: string) {
    this.logger.log(`Fetching profile for identity: ${id}`);
    
    const identity = await this.prisma.identity.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            rolePermissions: {
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

  async updateProfile(id: string, dto: UpdateProfileDto) {
    this.logger.log(`Updating profile for identity: ${id}`);
    
    // Ensure exists
    await this.getProfile(id);

    const updated = await this.prisma.identity.update({
      where: { id },
      data: {
        status: dto.status,
      },
    });

    const { passwordHash, ...safeIdentity } = updated;
    return safeIdentity;
  }
}
