import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { GatewayProxyService } from '../../proxy/gateway-proxy.service';
import { CustomerPatterns } from '@app/common/constants/customer.patterns';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import {
  ContractActionDto,
  ContractQueryDto,
  CreateContractDto,
  CreateViolationAppealDto,
  CreateViolationDto,
  RestrictionQueryDto,
  UpdateContractDto,
  ViolationActionDto,
  ViolationQueryDto,
} from '../dto/contract.dto';
import { ProviderCacheService } from '../provider-cache.service';
import { ProviderContractBffService } from './provider-contract-bff.service';
import { CurrentUserPayload } from '../provider.controller';
import { AuditEmitterService } from '../../shared/audit-emitter.service';

@Controller('api/provider')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
export class ProviderContractController {
  constructor(
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    @Inject('SIGNATURE_SERVICE') private readonly signatureClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
    private readonly providerCache: ProviderCacheService,
    private readonly contractBffService: ProviderContractBffService,
    private readonly auditEmitter: AuditEmitterService,
  ) {}

  @Get('contract-templates')
  async getContractTemplates(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TEMPLATES_FIND }, { providerId });
  }

  @Get('contract-templates/:id')
  async getContractTemplateDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') templateId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TEMPLATES_FIND_ONE }, { providerId, templateId });
  }

  @Get('contract-terms')
  async getContractTerms(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.TERMS_FIND }, { providerId });
  }

  @Get('contracts')
  async getContracts(@CurrentUser() user: CurrentUserPayload, @Query() query: ContractQueryDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.contractBffService.getContracts(providerId, query);
  }

  @Get('contracts/requests/:requestNumber')
  async getDraftByRequestNumber(@CurrentUser() user: CurrentUserPayload, @Param('requestNumber') contractNumber: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.contractBffService.getDraftByRequestNumber(providerId, contractNumber);
  }

  @Get('contracts/:id')
  async getContractById(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.contractBffService.getContractById(providerId, contractId);
  }

  @Post('contracts')
  async createContract(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateContractDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CREATE }, { providerId, dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'contract-service',
      action: 'CREATE_CONTRACT',
      entityType: 'Contract',
      entityId: (result as any)?.id,
      description: 'Tạo hợp đồng mới',
    });
    return result;
  }

  @Put('contracts/:id')
  async updateContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: UpdateContractDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.UPDATE }, { providerId, contractId, dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'contract-service',
      action: 'UPDATE_CONTRACT',
      entityType: 'Contract',
      entityId: contractId,
      description: 'Hoàn thiện / cập nhật hợp đồng',
    });
    return result;
  }

  @Post('contracts/:id/send')
  async sendContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.SEND }, { providerId, contractId });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'contract-service',
      action: 'UPDATE_CONTRACT',
      entityType: 'Contract',
      entityId: contractId,
      description: 'Gửi hợp đồng chờ ký',
    });
    return result;
  }

  @Get('contracts/:id/signing-file')
  async getSigningFile(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.SIGNING_FILE_FIND }, { providerId, contractId });
  }

  @Get('signature/status')
  async getSignatureStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.proxy.send(this.signatureClient, { cmd: CustomerPatterns.GET_DIGITAL_SIGNATURE_IN_SETTING }, { identityId: user.id });
  }

  @Post('contracts/:id/revoke')
  async revokeContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.REVOKE }, { providerId, contractId, dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'contract-service',
      action: 'UPDATE_CONTRACT',
      entityType: 'Contract',
      entityId: contractId,
      description: `Thu hồi hợp đồng về nháp${dto?.reason ? ': ' + dto.reason : ''}`,
    });
    return result;
  }

  @Post('contracts/:id/cancel')
  async cancelContract(@CurrentUser() user: CurrentUserPayload, @Param('id') contractId: string, @Body() dto: ContractActionDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CANCEL }, { providerId, contractId, dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'contract-service',
      action: 'TERMINATE_CONTRACT',
      entityType: 'Contract',
      entityId: contractId,
      description: `Hủy / từ chối hợp đồng${dto?.reason ? ': ' + dto.reason : ''}`,
    });
    return result;
  }

  @Get('violations/rules')
  async getViolationRules(@Query('targetType') targetType?: 'CUSTOMER' | 'PROVIDER') {
    return this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.VIOLATIONS_RULES }, { targetType });
  }

  @Get('violations')
  async getViolations(@CurrentUser() user: CurrentUserPayload, @Query() query: ViolationQueryDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.contractBffService.getViolations(providerId, user.id, query);
  }

  @Post('violations')
  async createViolation(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateViolationDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.VIOLATIONS_CREATE }, { providerId, reportedBy: user.id, ...dto });
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'contract-service',
      action: 'CREATE_VIOLATION',
      entityType: 'ViolationCase',
      entityId: (result as any)?.id,
      description: `Lập biên bản vi phạm: ${dto.description}`,
    });
    return result;
  }

  @Post('violations/:id/appeals')
  async createAppeal(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') violationCaseId: string,
    @Body() dto: CreateViolationAppealDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.contractClient,
      { cmd: ProviderContractPatterns.VIOLATIONS_APPEALS_CREATE },
      { providerId, violationCaseId, reason: dto.reason, appellantId: user.id }
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'contract-service',
      action: 'CREATE_APPEAL',
      entityType: 'ViolationAppeal',
      entityId: (result as any)?.id || (result as any)?.appeal?.id,
      description: `Gửi khiếu nại vi phạm: ${dto.reason}`,
    });
    return result;
  }

  @Post('violations/:id/actions')
  async handleViolationAction(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') violationCaseId: string,
    @Body() dto: ViolationActionDto,
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.contractClient,
      { cmd: ProviderContractPatterns.VIOLATIONS_HANDLE_ACTION },
      {
        providerId,
        violationCaseId,
        actionType: dto.actionType,
        description: dto.description,
        performedBy: user.id,
        resolveViolation: dto.resolveViolation,
        createRestriction: dto.createRestriction,
        amount: dto.amount,
      },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'contract-service',
      action: 'RESOLVE_VIOLATION',
      entityType: 'ViolationCase',
      entityId: violationCaseId,
      description: `Xử lý vi phạm (${dto.actionType}): ${dto.description}`,
    });
    return result;
  }

  @Get('customers')
  async getCustomers(@CurrentUser() user: CurrentUserPayload) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.contractBffService.getCustomers(providerId);
  }

  @Post('customers/:id/block')
  async blockCustomer(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') customerId: string,
    @Body() dto: { reason: string; contractId?: string },
  ) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.contractClient, 
      { cmd: ProviderContractPatterns.CUSTOMERS_BLOCK }, 
      { providerId, customerId, reason: dto.reason, blockBy: user.id, contractId: dto.contractId }
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'contract-service',
      action: 'RESTRICT_CUSTOMER',
      entityType: 'Customer',
      entityId: customerId,
      description: `Hạn chế khách hàng: ${dto.reason}`,
    });
    return result;
  }

  @Get('restrictions')
  async getRestrictions(@CurrentUser() user: CurrentUserPayload, @Query() query: RestrictionQueryDto) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    return this.proxy.send(
      this.contractClient,
      { cmd: ProviderContractPatterns.RESTRICTIONS_FIND },
      { providerId, status: query.status },
    );
  }

  @Put('restrictions/:id/lift')
  async liftRestriction(@CurrentUser() user: CurrentUserPayload, @Param('id') restrictionId: string) {
    const providerId = await this.providerCache.resolveActiveProvider(user);
    const result = await this.proxy.send(
      this.contractClient,
      { cmd: ProviderContractPatterns.RESTRICTIONS_LIFT },
      { providerId, restrictionId },
    );
    this.auditEmitter.emit({
      userId: user.id,
      serviceName: 'contract-service',
      action: 'UPDATE',
      entityType: 'Restriction',
      entityId: restrictionId,
      description: 'Gỡ bỏ hạn chế khách hàng',
    });
    return result;
  }
}
