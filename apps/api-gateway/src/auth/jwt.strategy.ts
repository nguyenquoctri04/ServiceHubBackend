import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AuthenticatedUser,
  JwtPayload,
} from "@app/common/types/authenticated-user.type";
import { RedisService, SecureRpcService } from "@app/common";
import { ClientProxy } from "@nestjs/microservices";
import { Patterns } from "@app/common/constants/patterns";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @Inject("IDENTITY_SERVICE") private readonly identityClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
    private configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException("Invalid token payload");
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing access token");
    }

    const accessToken = authHeader.substring(7);

    const storedToken = await this.redisService.get(
      `access_token:${payload.sub}`,
    );

    if (!storedToken) {
      throw new UnauthorizedException("Token has been revoked");
    }

    if (storedToken !== accessToken) {
      throw new UnauthorizedException("Invalid access token");
    }

    let isActive = true;
    const cacheKey = `user_active:${payload.sub}`;
    try {
      const cachedActive = await this.redisService.get(cacheKey);
      if (cachedActive !== null) {
        isActive = cachedActive === "1";
      } else {
        const result = await this.secureRpc.send(
          this.identityClient,
          { cmd: Patterns.CHECK_USER_ACTIVE },
          { userId: payload.sub },
          3000,
        );
        isActive = Boolean(result);
        await this.redisService.set(cacheKey, isActive ? "1" : "0", 60);
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to verify active status for user ${payload.sub} from identity-service: ${err?.message || err}. Falling back to active based on valid Redis session.`,
      );
      isActive = true;
    }

    if (!isActive) {
      throw new UnauthorizedException("Account is inactive");
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      isEkycVerified: payload.isEkycVerified ?? false,
      providerId: payload.providerId ?? null,
    };
  }
}
