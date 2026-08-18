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
}
