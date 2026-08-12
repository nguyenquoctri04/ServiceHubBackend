import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createRole(dto: CreateRoleDto) {
    this.logger.log(`Creating new role: ${dto.name}`);
    
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    
    if (existing) {
      throw new BadRequestException('Role already exists');
    }

    return await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async getAllRoles() {
    return await this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });
  }

  async assignPermissions(dto: AssignPermissionDto) {
    this.logger.log(`Assigning permissions to role: ${dto.roleId}`);
    
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Upsert role permissions
    const createData = dto.permissionIds.map(permissionId => ({
      roleId: dto.roleId,
      permissionId,
    }));

    // In a real scenario, you might want to delete old permissions or just add new ones.
    // Here we just insert ignoring conflicts if they already exist, or clear and insert.
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: dto.roleId }
    });

    await this.prisma.rolePermission.createMany({
      data: createData,
      skipDuplicates: true,
    });

    return { success: true, message: 'Permissions assigned successfully' };
  }
}
