import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProviderContractsService, CreateContractPayload, UpdateContractPayload } from './provider.contracts.service';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';

@Controller()
export class ProviderContractsController {
  constructor(private readonly providerContractsService: ProviderContractsService) { }

  @MessagePattern({ cmd: ProviderContractPatterns.CREATE })
  async createContract(@Payload() payload: { providerId: string; dto: CreateContractPayload }) {
    return this.providerContractsService.createContract(payload.providerId, payload.dto);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.UPDATE })
  async updateContract(@Payload() payload: { providerId: string; contractId: string; dto: UpdateContractPayload }) {
    return this.providerContractsService.updateContract(payload.providerId, payload.contractId, payload.dto);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.SEND })
  async sendContract(@Payload() payload: { providerId: string; contractId: string }) {
    return this.providerContractsService.sendContract(payload.providerId, payload.contractId);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.REVOKE })
  async revokeContract(@Payload() payload: { providerId: string; contractId: string; dto: { reason?: string } }) {
    return this.providerContractsService.revokeContract(payload.providerId, payload.contractId, payload.dto?.reason);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.CANCEL })
  async cancelContract(@Payload() payload: { providerId: string; contractId: string; dto: { reason?: string } }) {
    return this.providerContractsService.cancelContract(payload.providerId, payload.contractId, payload.dto?.reason);
  }

  @MessagePattern({ cmd: 'provider.customers.find' })
  async findCustomers(@Payload() payload: { providerId: string; query: any }) {
    return this.providerContractsService.findContracts({ providerId: payload.providerId, ...payload.query });
  }

  @MessagePattern({ cmd: ProviderContractPatterns.FIND })
  async findContracts(@Payload() payload: { providerId: string; status?: string; page?: string; limit?: string }) {
    return this.providerContractsService.findContracts(payload);
  }

  @MessagePattern({ cmd: 'provider.customers.block' })
  async blockCustomer(@Payload() payload: { providerId: string; customerId: string; reason: string; blockBy: string }) {
    return this.providerContractsService.blockCustomer(payload);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.RESTRICTIONS_FIND })
  async findRestrictions(@Payload() payload: { providerId: string; status?: 'ACTIVE' | 'LIFTED' }) {
    return this.providerContractsService.findRestrictions(payload.providerId, payload.status);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.RESTRICTIONS_LIFT })
  async liftRestriction(@Payload() payload: { providerId: string; restrictionId: string }) {
    return this.providerContractsService.liftRestriction(payload.providerId, payload.restrictionId);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.FIND_ONE })
  async findOneContract(@Payload() payload: { providerId: string; contractId: string }) {
    // Calling the service method to find one contract
    return this.providerContractsService.findOneContract(payload.providerId, payload.contractId);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.FIND_BY_IDS })
  async findContractsByIds(@Payload() payload: { providerId: string; contractIds: string[] }) {
    return this.providerContractsService.getContractsByIdsForProvider(payload.providerId, payload.contractIds);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.FIND_ACTIVE_BY_ROOM_IDS })
  async findActiveContractsByRoomIds(@Payload() payload: { providerId: string; roomIds: string[] }) {
    return this.providerContractsService.findActiveContractsByRoomIds(payload.providerId, payload.roomIds);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.FIND_DRAFT_BY_REQUEST_NUMBER })
  async findDraftByRequestNumber(@Payload() payload: { providerId: string; contractNumber: string }) {
    return this.providerContractsService.findDraftByRequestNumber(payload.providerId, payload.contractNumber);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.TEMPLATES_FIND })
  async findTemplates(@Payload() payload: { providerId: string }) {
    return this.providerContractsService.findTemplates(payload.providerId);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.TEMPLATES_FIND_ONE })
  async findTemplate(@Payload() payload: { providerId: string; templateId: string }) {
    return this.providerContractsService.findTemplate(payload.providerId, payload.templateId);
  }

  @MessagePattern({ cmd: ProviderContractPatterns.TERMS_FIND })
  async findTerms(@Payload() payload: { providerId: string }) {
    return this.providerContractsService.findTerms(payload.providerId);
  }

  @MessagePattern({ cmd: ProviderBillingPatterns.CONTRACTS_BY_IDS })
  async getContractsByIds(@Payload() contractIds: string[]) {
    return this.providerContractsService.getContractsByIds(contractIds);
  }
}
