import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';

@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @MessagePattern({ cmd: 'roles.create' })
  async createRole(@Payload() dto: CreateRoleDto) {
    return await this.rolesService.createRole(dto);
  }

  @MessagePattern({ cmd: 'roles.getAll' })
  async getAllRoles() {
    return await this.rolesService.getAllRoles();
  }

  @MessagePattern({ cmd: 'roles.assignPermissions' })
  async assignPermissions(@Payload() dto: AssignPermissionDto) {
    return await this.rolesService.assignPermissions(dto);
  }
}
