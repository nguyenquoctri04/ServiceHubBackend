import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateServiceRequestDto {
  @IsUUID()
  providerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  servicePriceIds: string[];

  @IsOptional()
  @IsBoolean()
  requireSignature?: boolean;
}
