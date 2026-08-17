import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ViolationsService } from './violations.service';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';

@Controller()
export class ViolationsController {
  constructor(private readonly service: ViolationsService) {}

  @MessagePattern({ cmd: ProviderContractPatterns.VIOLATIONS_FIND })
  async findViolations(@Payload() data: { providerId: string, status?: string }) {
    return this.service.findByProvider(data.providerId, data.status);
  }

  @MessagePattern({ cmd: 'provider.violations.appeals.create' })
  async createAppeal(@Payload() data: { providerId: string, violationCaseId: string, reason: string, appellantId: string }) {
    return this.service.createAppeal(data);
  }
}
