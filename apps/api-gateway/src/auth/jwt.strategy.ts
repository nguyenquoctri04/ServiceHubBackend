import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
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
  constructor(
    @Inject("IDENTITY_SERVICE") private readonly identityClient: ClientProxy,
    private configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly secureRpc: SecureRpcService,
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

    const isActive = await this.secureRpc.send<boolean>(
      this.identityClient,
      { cmd: Patterns.CHECK_USER_ACTIVE },
      { userId: payload.sub },
    );

    if (!isActive) {
      throw new UnauthorizedException("Account is inactive");
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
