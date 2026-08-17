import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { ProvidersService } from './providers.service';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';

@Controller()
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) { }

  /**
   * Lấy hồ sơ Provider đầy đủ kèm legalDocuments.
   * Caller: API Gateway (provider.controller.ts) → GET /api/provider/profile
   */
  @MessagePattern({ cmd: 'providers.getProfile' })
  async getProfile(@Payload('identityId') identityId: string) {
    return this.providersService.getProviderProfile(identityId);
  }

  /**
   * Cập nhật hồ sơ Provider.
   * Caller: API Gateway (provider.controller.ts) → PUT /api/provider/profile
   */
  @MessagePattern({ cmd: 'providers.updateProfile' })
  async updateProfile(
    @Payload() payload: { identityId: string; dto: UpdateProviderProfileDto },
  ) {
    return this.providersService.updateProviderProfile(payload.identityId, payload.dto);
  }

  /**
   * RPC endpoint chuẩn cho cross-service validation.
   * Caller: Catalog Service, Contract Service
   * Pattern: 'get.provider.by.id'
   */
  @MessagePattern({ cmd: 'get.provider.by.id' })
  async getProviderById(@Payload() id: string) {
    const provider = await this.providersService.getProviderById(id);
    if (!provider) {
      // ProvidersService đã throw RpcException trước, nhánh này là safeguard
      throw new RpcException({ status: 404, message: 'Provider not found' });
    }
    return provider;
  }

  /**
   * Thêm giấy tờ pháp lý.
   */
  @MessagePattern({ cmd: 'providers.addLegalDocument' })
  async addLegalDocument(
    @Payload() payload: { identityId: string; dto: CreateLegalDocumentDto },
  ) {
    return this.providersService.addLegalDocument(payload.identityId, payload.dto);
  }


}
