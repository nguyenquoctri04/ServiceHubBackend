import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ViolationsService } from './violations.service';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';

@Controller()
export class ViolationsController {
  constructor(private readonly service: ViolationsService) {}

  @MessagePattern({ cmd: ProviderContractPatterns.VIOLATIONS_FIND })
  async findViolations(@Payload() data: { providerId: string, actorId?: string, status?: string, contractIds?: string[] }) {
    return this.service.findByProvider(data.providerId, data.actorId, data.status, data.contractIds);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.VIOLATIONS_COUNT })
  async countViolations(@Payload() data: { providerId: string, status?: string }) {
    return this.service.countByProvider(data.providerId, data.status);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.VIOLATIONS_CREATE })
  async createReport(@Payload() data: { providerId: string; contractId: string; reportedBy: string; description: string; violationType?: string }) {
    return this.service.createReport(data);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.VIOLATIONS_APPEALS_CREATE })
  async createAppeal(@Payload() data: { providerId: string, violationCaseId: string, reason: string, appellantId: string }) {
    return this.service.createAppeal(data);
  }

  /**
   * Xử lý hành động đối với vi phạm (tạo ViolationAction, tuỳ chọn đóng case).
   * Caller: API Gateway → POST /api/provider/violations/:id/actions
   */
  @MessagePattern({ cmd: ProviderContractPatterns.VIOLATIONS_HANDLE_ACTION })
  async handleAction(
    @Payload() data: {
      providerId: string;
      violationCaseId: string;
      actionType: string;
      description: string;
      performedBy: string;
      resolveViolation: boolean;
      createRestriction?: boolean;
    },
  ) {
    return this.service.handleAction(data);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.VIOLATIONS_RULES })
  async getViolationRules(@Payload() data?: { targetType?: 'CUSTOMER' | 'PROVIDER' }) {
    return this.service.getViolationRules(data?.targetType);
  }
}

