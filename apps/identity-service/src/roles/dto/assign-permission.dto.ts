import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AssignPermissionDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  permissionIds: string[];
}
