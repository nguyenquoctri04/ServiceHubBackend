import {
  Inject,
  Injectable,
  UnauthorizedException,
  HttpException,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom, catchError, throwError } from "rxjs";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

import { RedisService, SecureRpcService } from "@app/common";
import { Patterns } from "@app/common/constants/patterns";
import {
  AuthenticatedUser,
  JwtPayload,
} from "@app/common/types/authenticated-user.type";

@Injectable()
export class AuthService {
  constructor(
    @Inject("IDENTITY_SERVICE") private readonly identityClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress?: string) {
    try {
      return await this.secureRpc.send(
        this.identityClient,
        { cmd: Patterns.AUTH_REGISTER },
        { ...registerDto, ipAddress },
      );
    } catch (err: any) {
      console.error("RPC Error in register:", err);
      const errMsg =
        err?.message || err?.response?.message || err || "Unknown RPC Error";
      throw new HttpException(errMsg, err?.status || err?.statusCode || 400);
    }
  }

  async login(loginDto: LoginDto, ipAddress?: string) {
    let response: any;
    try {
      response = await this.secureRpc.send(
        this.identityClient,
        { cmd: Patterns.AUTH_LOGIN },
        { ...loginDto, ipAddress },
      );
    } catch (err: any) {
      console.error("RPC Error in login:", err);
      const errMsg =
        err?.message || err?.response?.message || err || "Unknown RPC Error";
      throw new HttpException(errMsg, err?.status || err?.statusCode || 401);
    }

    const userPayload = response.user || response;
    return await this.generateTokens(userPayload);
  }

  async refreshToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (e) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const userId = payload.sub;
    // Check if refresh token exists in Redis
    const storedToken = await this.redisService.get(`refresh_token:${userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException("Refresh token is invalid or revoked");
    }

    const user = { id: userId, email: payload.email, role: payload.role, providerId: payload.providerId };
    return await this.generateTokens(user);
  }

  async switchProfile(currentUser: AuthenticatedUser, providerId: string) {
    let response: any;
    try {
      response = await this.secureRpc.send(
        this.identityClient,
        { cmd: Patterns.AUTH_SWITCH_PROFILE },
        { userId: currentUser.id, providerId },
      );
    } catch (err: any) {
      console.error("RPC Error in switchProfile:", err);
      const errMsg = err?.message || err?.response?.message || err || "Failed to switch profile";
      throw new HttpException(errMsg, err?.status || err?.statusCode || 403);
    }

    if (!response || !response.success) {
        throw new HttpException("You do not have access to this profile", 403);
    }

    const updatedUser = { ...currentUser, providerId };
    return await this.generateTokens(updatedUser);
  }

  async logout(userId?: string) {
    if (userId) {
      await this.redisService.del(`access_token:${userId}`);
      await this.redisService.del(`refresh_token:${userId}`);
    }
  }

  private async generateTokens(user: AuthenticatedUser) {
    const payload = { sub: user.id, role: user.role, email: user.email, providerId: user.providerId };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

    // Save Access Token in Redis (15m TTL)
    await this.redisService.set(
      `access_token:${user.id}`,
      accessToken,
      15 * 60,
    );

    // Save Refresh Token in Redis (7d TTL)
    await this.redisService.set(
      `refresh_token:${user.id}`,
      refreshToken,
      7 * 24 * 60 * 60,
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }
}
