import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { AppealStatus, ViolationActionType } from '@prisma/client-contract';
import { ViolationType } from '@app/common';

@Injectable()
export class ViolationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProvider(providerId: string, actorId: string, status?: string) {
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

    // Never expose reportedBy. The UI receives only permissions derived from
    // the authenticated actor, so the reporter's identity remains private.
    return cases.map(c => ({
      id: c.id,
      contractId: c.contractId,
      contractNumber: c.contract?.contractNumber || '',
      roomName: '', 
      propertyName: '',
      customerName: '',
      violationType: c.violationRule?.name || ViolationType.OTHER,
      description: c.description,
      status: c.status,
      violationDate: c.occurredAt,
      reportView: c.reportedBy === actorId ? 'REPORTED_BY_ME' : 'REPORTED_AGAINST_ME',
      canProviderProcess: c.reportedBy === actorId && c.status === 'REPORTED',
      canProviderAppeal: c.reportedBy !== actorId && c.status === 'REPORTED',
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

    if (!violation || violation.reportedBy === data.appellantId) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy báo cáo có thể khiếu nại.' });
    }

    const existingAppeal = await this.prisma.violationAppeal.findFirst({
      where: { violationCaseId: data.violationCaseId, appellantId: data.appellantId, status: AppealStatus.PENDING },
      select: { id: true },
    });
    if (existingAppeal) throw new RpcException({ statusCode: 409, message: 'Khiếu nại đang được xử lý.' });

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

  /**
   * Xử lý một vi phạm: tạo ViolationAction và tuỳ chọn chuyển status sang RESOLVED.
   * Kiểm tra quyền: violation phải thuộc về providerId được truyền vào để tránh IDOR.
   */
  async handleAction(data: {
    providerId: string;
    violationCaseId: string;
    actionType: string;
    description: string;
    performedBy: string;
    resolveViolation: boolean;
    createRestriction?: boolean;
  }) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const violation = await tx.violationCase.findFirst({
        where: { id: data.violationCaseId, providerId: data.providerId, reportedBy: data.performedBy, status: 'REPORTED' },
        include: { contract: { select: { id: true, customerId: true, status: true } } },
      });
      if (!violation) throw new RpcException({ statusCode: 404, message: 'Không tìm thấy báo cáo có thể xử lý.' });
      const terminates = data.actionType === 'TERMINATE_CONTRACT';
      if (terminates && violation.contract.status !== 'ACTIVE') {
        throw new RpcException({ statusCode: 400, message: 'Chỉ có thể chấm dứt hợp đồng đang hiệu lực.' });
      }
      const action = await tx.violationAction.create({
        data: { violationCaseId: violation.id, performedBy: data.performedBy, actionType: data.actionType as ViolationActionType, reason: data.description, createdAt: now },
      });
      if (terminates) await tx.contract.update({ where: { id: violation.contractId }, data: { status: 'TERMINATED', updatedAt: now } });
      if (terminates && data.createRestriction) {
        const existing = await tx.restriction.findFirst({ where: { providerId: data.providerId, customerId: violation.contract.customerId, scopeType: 'PROVIDER', isDeleted: false, OR: [{ endAt: null }, { endAt: { gt: now } }] }, select: { id: true } });
        if (!existing) await tx.restriction.create({ data: { violationActionId: action.id, providerId: data.providerId, customerId: violation.contract.customerId, scopeType: 'PROVIDER', reason: data.description, startAt: now, createdBy: data.performedBy, createdAt: now, updatedAt: now } });
      }
      if (data.resolveViolation || terminates) await tx.violationCase.update({ where: { id: violation.id }, data: { status: 'RESOLVED', updatedAt: now } });
      return { success: true, action, contractId: violation.contractId, customerId: violation.contract.customerId, terminated: terminates };
    }, { isolationLevel: 'Serializable' });
  }
}
