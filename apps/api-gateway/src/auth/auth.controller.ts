import { Controller, Post, Body, Res, Req, UnauthorizedException, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard, CurrentUser } from '@app/common';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    return this.authService.register(registerDto, req.ip);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(loginDto, req.ip);

    // Set Refresh Token as HttpOnly Cookie
    this.setRefreshTokenCookie(res, refreshToken);

    return {
      message: 'Login successful',
      accessToken,
      user
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const tokens = await this.authService.refreshToken(refreshToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    
    return {
      accessToken: tokens.accessToken,
      user: tokens.user
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (refreshToken) {
      try {
        const payload = this.jwtService.decode(refreshToken) as any;
        if (payload?.sub) {
          await this.authService.logout(payload.sub);
        }
      } catch (e) {
        // Ignore decode error
      }
    }
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logout successful' };
  }

  // Example of a protected endpoint directly testing the token
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return {
      message: 'Token is valid',
      user
    };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

}
