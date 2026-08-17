import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { ProvidersService } from './providers.service';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';

@Controller()
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  /**
   * Get full Provider profile including legalDocuments.
   * Caller: API Gateway (provider.controller.ts) → GET /api/provider/profile
   */
  @MessagePattern({ cmd: 'providers.getProfile' })
  async getProfile(@Payload('identityId') identityId: string) {
    return this.providersService.getProviderProfile(identityId);
  }

  /**
   * Update Provider profile.
   * Caller: API Gateway (provider.controller.ts) → PUT /api/provider/profile
   */
  @MessagePattern({ cmd: 'providers.updateProfile' })
  async updateProfile(
    @Payload() payload: { identityId: string; dto: UpdateProviderProfileDto },
  ) {
    return this.providersService.updateProviderProfile(payload.identityId, payload.dto);
  }

  /**
   * Standard RPC endpoint for cross-service validation.
   * Caller: Catalog Service (Phase 3), Contract Service (Phase 4)
   * Pattern: 'get.provider.by.id' - according to project_documentation.md
   */
  @MessagePattern({ cmd: 'get.provider.by.id' })
  async getProviderById(@Payload() id: string) {
    return this.providersService.getProviderById(id);
  }

  /**
   * Add legal document.
   */
  @MessagePattern({ cmd: 'providers.addLegalDocument' })
  async addLegalDocument(
    @Payload() payload: { identityId: string; dto: CreateLegalDocumentDto },
  ) {
    return this.providersService.addLegalDocument(payload.identityId, payload.dto);
  }


}
