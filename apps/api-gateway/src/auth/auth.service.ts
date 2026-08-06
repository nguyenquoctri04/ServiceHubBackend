import { Inject, Injectable, UnauthorizedException, HttpException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress?: string) {
    // Send register payload to Identity Service
    const response = await firstValueFrom(
      this.identityClient.send({ cmd: 'auth.register' }, { ...registerDto, ipAddress }).pipe(
        catchError(err => {
          console.error('RPC Error in register:', err);
          const errMsg = err?.message || err?.response?.message || err || 'Unknown RPC Error';
          return throwError(() => new HttpException(errMsg, err?.status || err?.statusCode || 400));
        })
      )
    );
    return response;
  }

  async login(loginDto: LoginDto, ipAddress?: string) {
    // Send login payload to Identity Service to verify credentials
    const response = await firstValueFrom(
      this.identityClient.send({ cmd: 'auth.login' }, { ...loginDto, ipAddress }).pipe(
        catchError(err => {
          console.error('RPC Error in login:', err);
          const errMsg = err?.message || err?.response?.message || err || 'Unknown RPC Error';
          return throwError(() => new HttpException(errMsg, err?.status || err?.statusCode || 401));
        })
      )
    );

    // If valid, sign Access & Refresh Tokens using the actual user payload
    return this.generateTokens(response.user || response);
  }

  async refreshToken(userId: string, role: string) {
    // Optionally check if user still exists/is active in IdentityService
    // For simplicity, we just issue a new token based on the refresh token payload
    const user = { id: userId, role };
    return this.generateTokens(user);
  }

  private generateTokens(user: any) {
    const payload = { sub: user.id, role: user.role, email: user.email };
    
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user
    };
  }
}
