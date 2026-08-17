import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ViolationTargetType, AppealStatus } from '@prisma/client-contract';
import { ViolationType } from '@app/common';

@Injectable()
export class ViolationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProvider(providerId: string, status?: string) {
    const where: any = {
      contract: {
        providerId
      }
    };
    
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const cases = await this.prisma.violationCase.findMany({
      where,
      include: {
        violationRule: true,
        contract: true,
        actions: true,
        appeals: true,
      },
      orderBy: { occurredAt: 'desc' }
    });

    // Map to FE expected format loosely
    return cases.map(c => ({
      id: c.id,
      contractId: c.contractId,
      roomName: '', 
      propertyName: '',
      customerName: '',
      violationType: c.violationRule?.name || ViolationType.OTHER,
      description: c.description,
      status: c.status,
      violationDate: c.occurredAt,
      reporterType: c.reportedBy === providerId ? ViolationTargetType.PROVIDER : ViolationTargetType.CUSTOMER,
      violatorType: c.reportedBy === providerId ? ViolationTargetType.CUSTOMER : ViolationTargetType.PROVIDER,
      actions: c.actions.map(a => ({
        id: a.id,
        actionType: a.actionType,
        description: a.reason || '',
        createdAt: a.createdAt
      })),
      appeals: c.appeals.map(a => ({
        id: a.id,
        reason: a.reason,
        status: a.status,
        createdAt: a.createdAt,
        resolutionNote: a.resolutionNote
      }))
    }));
  }

  async createAppeal(data: { providerId: string; violationCaseId: string; reason: string; appellantId: string }) {
    const violation = await this.prisma.violationCase.findFirst({
      where: {
        id: data.violationCaseId,
        providerId: data.providerId
      }
    });

    if (!violation) {
      throw new Error('Violation case not found');
    }

    const appeal = await this.prisma.violationAppeal.create({
      data: {
        violationCaseId: data.violationCaseId,
        appellantId: data.appellantId,
        reason: data.reason,
        status: AppealStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return { success: true, appeal };
  }
}
