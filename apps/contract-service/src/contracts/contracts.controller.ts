import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContractsService } from './contracts.service';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';

@Controller()
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @MessagePattern({ cmd: ProviderContractPatterns.CUSTOMERS_FIND })
  async findCustomers(@Payload() data: { providerId: string, status?: string, page?: number, limit?: number, search?: string }) {
    return this.service.findCustomersByProvider(data.providerId, data);
  }

  @MessagePattern({ cmd: 'contract.statusDistribution' })
  async getStatusDistribution(@Payload() data: { providerId: string }) {
    return this.service.getStatusDistribution(data.providerId);
  }

  @MessagePattern({ cmd: 'contract.expiring' })
  async getExpiringContracts(@Payload() data: { providerId: string }) {
    return this.service.getExpiringContracts(data.providerId);
  }

  @MessagePattern({ cmd: 'contract.recent' })
  async getRecentContracts(@Payload() data: { providerId: string }) {
    return this.service.getRecentContracts(data.providerId);
  }
}
