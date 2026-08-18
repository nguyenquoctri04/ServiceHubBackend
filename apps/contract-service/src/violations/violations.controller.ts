import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ViolationsService } from './violations.service';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';

@Controller()
export class ViolationsController {
  constructor(private readonly service: ViolationsService) {}

  @MessagePattern({ cmd: ProviderContractPatterns.VIOLATIONS_FIND })
  async findViolations(@Payload() data: { providerId: string, actorId: string, status?: string }) {
    return this.service.findByProvider(data.providerId, data.actorId, data.status);
  }

  @MessagePattern({ cmd: 'provider.violations.appeals.create' })
  async createAppeal(@Payload() data: { providerId: string, violationCaseId: string, reason: string, appellantId: string }) {
    return this.service.createAppeal(data);
  }

  /**
   * Xử lý hành động đối với vi phạm (tạo ViolationAction, tuỳ chọn đóng case).
   * Caller: API Gateway → POST /api/provider/violations/:id/actions
   */
  @MessagePattern({ cmd: 'provider.violations.handleAction' })
  async handleAction(
    @Payload() data: {
      providerId: string;
      violationCaseId: string;
      actionType: string;
      description: string;
      performedBy: string;
      resolveViolation: boolean;
    },
  ) {
    return this.service.handleAction(data);
  }
}

