import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'auth.register' })
  async register(@Payload() payload: RegisterDto & { ipAddress?: string }) {
    return await this.authService.register(payload);
  }

  @MessagePattern({ cmd: 'auth.login' })
  async login(@Payload() payload: LoginDto & { ipAddress?: string }) {
    return await this.authService.login(payload);
  }
}
