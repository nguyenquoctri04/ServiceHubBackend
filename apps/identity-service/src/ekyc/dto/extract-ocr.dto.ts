import { IsNotEmpty, IsString } from 'class-validator';

export class ExtractOcrDto {
  @IsString()
  @IsNotEmpty()
  identityId: string;

  @IsString()
  @IsNotEmpty()
  frontImage: string;

  @IsString()
  @IsNotEmpty()
  backImage: string;
}
