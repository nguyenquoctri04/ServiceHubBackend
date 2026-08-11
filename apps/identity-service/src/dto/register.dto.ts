import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự trở lên' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;

  @IsOptional()
  @IsString()
  role?: string; // 'CUSTOMER' | 'PROVIDER' | 'ADMIN'
}
