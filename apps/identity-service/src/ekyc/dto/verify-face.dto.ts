import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyFaceDto {
  @IsString()
  @IsNotEmpty()
  identityId: string;

  @IsString()
  @IsNotEmpty()
  verificationId: string;

  @IsString()
  @IsNotEmpty()
  selfieImage: string;
}
