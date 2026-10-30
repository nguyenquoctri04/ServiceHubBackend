import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { AppealStatus, ViolationActionType } from '@prisma/client-contract';
import { NotificationPatterns, SecureRpcService, ViolationType, OutboxService, ContractEventPatterns, ViolationEventPatterns } from '@app/common';

@Injectable()
export class ViolationsService {
  private readonly logger = new Logger(ViolationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
    private readonly outboxService: OutboxService,
  ) {}

  async findByProvider(providerId: string, actorId?: string, status?: string, contractIds?: string[]) {
    const where: any = {
      providerId,
    };
    
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (contractIds?.length) {
      where.contractId = { in: contractIds };
    }

    const cases = await this.prisma.violationCase.findMany({
      where,
      include: {
        violationRule: true,
        contract: {
          select: {
            contractNumber: true,
            roomId: true,
            customerId: true,
          },
        },
        actions: true,
        appeals: true,
        evidence: true,
      },
      orderBy: { occurredAt: 'desc' }
    });

    // Never expose reportedBy. The UI receives only permissions derived from
    // the authenticated actor, so the reporter's identity remains private.
    // Categorize correctly:
    // If rule targets CUSTOMER -> Customer is violator ("Khách hàng vi phạm"), provider manages/takes action.
    // If rule targets PROVIDER -> Provider is accused ("Bị báo cáo"), provider can appeal.
    // If targetType is BOTH or undefined -> fallback to reportedBy === actorId.
    return cases.map(c => {
      const targetType = c.violationRule?.targetType;
      let isCustomerViolation: boolean;

      if (targetType === 'CUSTOMER') {
        isCustomerViolation = true;
      } else if (targetType === 'PROVIDER') {
        isCustomerViolation = false;
      } else {
        isCustomerViolation = c.reportedBy === actorId;
      }

      const reportView = isCustomerViolation ? 'REPORTED_BY_ME' : 'REPORTED_AGAINST_ME';
      const canProviderProcess = isCustomerViolation && c.status === 'REPORTED';
      const canProviderAppeal = !isCustomerViolation && c.status === 'REPORTED';

      return {
        id: c.id,
        contractId: c.contractId,
        contractNumber: c.contract?.contractNumber || '',
        roomId: c.contract?.roomId,
        customerId: c.contract?.customerId,
        violationType: c.violationRule?.name || ViolationType.OTHER,
        description: c.description,
        status: c.status,
        violationDate: c.occurredAt,
        reportView,
        canProviderProcess,
        canProviderAppeal,
        evidence: (c as any).evidence?.map((e: any) => ({
          id: e.id,
          fileUrl: e.fileUrl,
        })) || [],
        actions: c.actions.map(a => ({
          id: a.id,
          actionType: a.actionType,
          description: a.reason || '',
          createdAt: a.createdAt
        })),
        appeals: c.appeals.map(ap => ({
          id: ap.id,
          reason: ap.reason,
          status: ap.status,
          resolutionNote: ap.resolutionNote,
          createdAt: ap.createdAt
        }))
      };
    });
  }

  async countByProvider(providerId: string, status?: string): Promise<number> {
    const where: any = {
      providerId,
    };
    if (status) {
      where.status = status;
    }
    return this.prisma.violationCase.count({ where });
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

  async createReport(data: { providerId: string; contractId: string; reportedBy: string; description: string; violationType?: string; evidenceUrls?: string[] }) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: data.contractId, providerId: data.providerId },
      select: { id: true, customerId: true, status: true, endDate: true, updatedAt: true },
    });
    if (!contract) throw new RpcException({ statusCode: 404, message: 'Không tìm thấy hợp đồng thuộc workspace.' });

    const now = new Date();
    const isAllowedActive = contract.status === 'ACTIVE';

    // Cho phép hợp đồng EXPIRED trong vòng 30 ngày để xử lý hậu kiểm bàn giao, hư hại tài sản và cọc
    let isAllowedExpired = false;
    if (contract.status === 'EXPIRED') {
      const expirationRefDate = contract.endDate ? new Date(contract.endDate) : new Date(contract.updatedAt);
      const diffMs = now.getTime() - expirationRefDate.getTime();
      const maxPostContractMs = 30 * 24 * 60 * 60 * 1000;
      if (diffMs <= maxPostContractMs) {
        isAllowedExpired = true;
      }
    }

    if (!isAllowedActive && !isAllowedExpired) {
      throw new RpcException({
        statusCode: 400,
        message: 'Chỉ có thể tạo báo cáo vi phạm đối với hợp đồng đang có hiệu lực (ACTIVE) hoặc hợp đồng vừa hết hạn (EXPIRED) trong vòng 30 ngày để xử lý bàn giao phòng và tiền cọc.',
      });
    }
    
    const evidenceUrls = [...new Set(data.evidenceUrls ?? [])];
    if (evidenceUrls.length > 5) {
      throw new RpcException({ statusCode: 400, message: 'Bạn chỉ được gửi tối đa 5 file bằng chứng.' });
    }
    if (
      evidenceUrls.some((fileUrl) => {
        try {
          const parsed = new URL(fileUrl);
          return parsed.hostname !== 'res.cloudinary.com' || parsed.protocol !== 'https:';
        } catch {
          return true;
        }
      })
    ) {
      throw new RpcException({
        statusCode: 400,
        message: 'File bằng chứng phải là đường dẫn bảo mật hợp lệ tải lên từ hệ thống.',
      });
    }

    const ruleName = data.violationType || ViolationType.OTHER;
    let rule = await this.prisma.violationRule.findFirst({ where: { name: ruleName, targetType: 'CUSTOMER', isActive: true } });
    if (!rule) rule = await this.prisma.violationRule.create({ data: { name: ruleName, targetType: 'CUSTOMER', isActive: true, createdAt: new Date(), updatedAt: new Date() } });
    const violation = await this.prisma.violationCase.create({
      data: {
        violationRuleId: rule.id,
        contractId: contract.id,
        providerId: data.providerId,
        reportedBy: data.reportedBy,
        status: 'REPORTED',
        description: data.description,
        occurredAt: now,
        createdAt: now,
        updatedAt: now,
        ...(evidenceUrls.length > 0 ? {
          evidence: {
            create: evidenceUrls.map((fileUrl) => ({ fileUrl })),
          },
        } : {}),
      },
      include: {
        violationRule: true,
        evidence: true,
      },
    });
    try {
      await this.secureRpc.send(
        this.notificationClient,
        { cmd: NotificationPatterns.CREATE_IN_APP },
        {
          userId: contract.customerId,
          providerId: data.providerId,
          title: 'Có báo cáo vi phạm mới',
          content: 'Một báo cáo vi phạm liên quan đến hợp đồng của bạn đã được tạo. Vui lòng mở hợp đồng để theo dõi.',
        },
      );
    } catch (notifErr: any) {
      this.logger.warn(`Failed to dispatch in-app notification for violation ${violation.id}: ${notifErr?.message || notifErr}`);
    }
    return violation;
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
    const result = await this.prisma.$transaction(async (tx) => {
      const violation = await tx.violationCase.findFirst({
        where: {
          id: data.violationCaseId,
          providerId: data.providerId,
          status: 'REPORTED',
          OR: [
            { reportedBy: data.performedBy },
            { violationRule: { targetType: { in: ['CUSTOMER', 'BOTH'] } } },
          ],
        },
        include: { contract: { select: { id: true, customerId: true, status: true, contractNumber: true, roomId: true, revision: true } } },
      });
      if (!violation) throw new RpcException({ statusCode: 404, message: 'Không tìm thấy báo cáo có thể xử lý.' });
      const terminates = data.actionType === 'TERMINATE_CONTRACT';
      if (terminates && violation.contract.status !== 'ACTIVE') {
        throw new RpcException({ statusCode: 400, message: 'Chỉ có thể chấm dứt hợp đồng đang hiệu lực.' });
      }
      const action = await tx.violationAction.create({
        data: { violationCaseId: violation.id, performedBy: data.performedBy, actionType: data.actionType as ViolationActionType, reason: data.description, createdAt: now },
      });
      if (terminates) {
        const updatedContract = await tx.contract.update({
          where: { id: violation.contractId },
          data: { status: 'TERMINATED', updatedAt: now, revision: { increment: 1 } },
        });

        await this.outboxService.publishLocal(tx, {
          aggregateType: 'Contract',
          aggregateId: updatedContract.id,
          aggregateRevision: updatedContract.revision,
          eventType: ContractEventPatterns.TERMINATED,
          payload: {
            contractId: updatedContract.id,
            contractNumber: updatedContract.contractNumber,
            providerId: data.providerId,
            customerId: violation.contract.customerId,
            roomId: updatedContract.roomId,
            reason: data.description,
            violationCaseId: violation.id,
          },
        });
      }
      if (data.actionType === 'FINE') {
        await this.outboxService.publishLocal(tx, {
          aggregateType: 'ViolationCase',
          aggregateId: violation.id,
          aggregateRevision: 1,
          eventType: ViolationEventPatterns.FINE_IMPOSED,
          payload: {
            violationCaseId: violation.id,
            contractId: violation.contractId,
            providerId: data.providerId,
            customerId: violation.contract.customerId,
            reason: data.description,
          },
        });
      }
      if (terminates && data.createRestriction) {
        const existing = await tx.restriction.findFirst({ where: { providerId: data.providerId, customerId: violation.contract.customerId, scopeType: 'PROVIDER', isDeleted: false, OR: [{ endAt: null }, { endAt: { gt: now } }] }, select: { id: true } });
        if (!existing) await tx.restriction.create({ data: { violationActionId: action.id, providerId: data.providerId, customerId: violation.contract.customerId, scopeType: 'PROVIDER', reason: data.description, startAt: now, createdBy: data.performedBy, createdAt: now, updatedAt: now } });
      }
      if (data.resolveViolation || terminates) await tx.violationCase.update({ where: { id: violation.id }, data: { status: 'RESOLVED', updatedAt: now } });
      return { success: true, action, contractId: violation.contractId, customerId: violation.contract.customerId, terminated: terminates };
    }, { isolationLevel: 'Serializable' });
    if (result.terminated) {
      await this.secureRpc.send(this.notificationClient, { cmd: NotificationPatterns.CREATE_IN_APP }, {
        userId: result.customerId, providerId: data.providerId,
        title: 'Hợp đồng đã bị chấm dứt',
        content: 'Nhà cung cấp đã chấm dứt hợp đồng do vi phạm. Vui lòng xem chi tiết hợp đồng và liên hệ nhà cung cấp nếu cần.',
      });
    }
    return result;
  }

  async getViolationRules(targetType?: 'CUSTOMER' | 'PROVIDER') {
    const where: any = { isActive: true };
    if (targetType) {
      where.targetType = targetType;
    }
    return this.prisma.violationRule.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        targetType: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
