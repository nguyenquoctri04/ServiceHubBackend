import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('AUDIT_SERVICE') private readonly auditClient: ClientProxy,
  ) {}

  async processTestPing(data: any) {
    // 3. Provider Service received command.
    // 4. Provider Service calls Audit Service before returning.
    
    let auditStatus = 'Success';
    try {
      await firstValueFrom(
        this.auditClient.send({ cmd: 'audit.log' }, {
          action: 'OTHER', // Must match AuditAction enum
          description: `User ${data.email} triggered a ping to Provider Service.`,
          userId: data.userId || null
        })
      );
    } catch (e) {
      auditStatus = `Failed: ${e.message}`;
    }

    return {
      service: 'ProviderService',
      status: 'Alive',
      receivedData: data,
      auditLogStatus: auditStatus,
      timestamp: new Date().toISOString()
    };
  }
}
