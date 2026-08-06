import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  status?: string;

  // Add more fields if necessary, like changing email or linking other information
}
