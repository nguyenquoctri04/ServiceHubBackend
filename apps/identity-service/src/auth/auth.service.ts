import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService
  ) {}

  async register(dto: RegisterDto & { ipAddress?: string }) {
    this.logger.log(`Registering new identity for email: ${dto.email}`);
    
    // 1. Check if email exists
    const existingUser = await this.prisma.identity.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new RpcException({ message: 'Email is already registered', statusCode: 400 });
    }

    // 2. Find Role
    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!role) {
      throw new RpcException({ message: `Role ${dto.role} not found`, statusCode: 400 });
    }

    // 3. Hash Password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 4. Create Identity
    const newIdentity = await this.prisma.identity.create({
      data: {
        email: dto.email,
        phone: dto.phoneNumber || '',
        passwordHash,
        roleId: role.id,
        status: 'ACTIVE',
        isEkycVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      id: newIdentity.id,
      email: newIdentity.email,
      role: role.name,
      status: newIdentity.status,
    };
  }

  async login(dto: LoginDto & { ipAddress?: string }) {
    this.logger.log(`Attempting login for email: ${dto.email}`);
    
    // 1. Find User
    const identity = await this.prisma.identity.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!identity) {
      throw new RpcException({ message: 'Invalid credentials', statusCode: 401 });
    }

    // 2. Verify Password
    const isPasswordValid = await bcrypt.compare(dto.password, identity.passwordHash);
    if (!isPasswordValid) {
      throw new RpcException({ message: 'Invalid credentials', statusCode: 401 });
    }

    // 3. Record Authentication History (Note: AuthenticationHistory model removed from schema)
    this.logger.log(`User ${identity.id} logged in successfully from IP ${dto.ipAddress || 'Unknown'}`);

    return {
      user: {
        id: identity.id,
        email: identity.email,
        role: identity.role.name,
        isEkycVerified: identity.isEkycVerified,
      },
    };
  }
}
