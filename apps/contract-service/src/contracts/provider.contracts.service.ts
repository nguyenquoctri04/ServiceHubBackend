import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ContractStatus, Contract } from '@prisma/client-contract';
import { CatalogPatterns, NotificationPatterns, ProviderBillingPatterns, ProviderIdentityPatterns, SecureRpcService } from '@app/common';
import { CustomerPatterns } from '@app/common/constants/customer.patterns';
import { ContractTemplate, Term } from '@prisma/client-contract';
import { createHash } from 'node:crypto';
import { ContractPdfRendererService } from './contract-pdf-renderer.service';
/**
 * Payload interface for creating a contract.
 */
export interface CreateContractPayload {
  templateId?: string;
  customerId: string;
  roomId?: string;
  startDate?: string;
  endDate?: string;
  requireSignature?: boolean;
  services: { servicePriceId: string; quantity?: number }[];
  termIds?: string[];
}

/**
 * Payload interface for updating a contract.
 */
export interface UpdateContractPayload {
  templateId?: string;
  roomId?: string;
  startDate?: string;
  endDate?: string;
  requireSignature?: boolean;
  services?: { servicePriceId: string; quantity?: number }[];
  termIds?: string[];
}

/**
 * Payload interface for querying contracts.
 */
export interface ContractQueryPayload {
  providerId: string;
  status?: string;
  page?: string | number;
  limit?: string | number;
}

export interface CustomerIdentity {
  id: string;
  fullName?: string | null;
  email?: string;
  phone?: string;
}

export interface EnrichedContract extends Contract {
  customerName: string;
  customerPhone: string;
  roomName: string;
  services: any[];
  terms?: any[];
  files?: Array<{ id: string; pdfUrl: string; hashContract: string | null }>;
}

type ContractWithRelations = Contract & {
  services: Array<{ servicePriceId: string; [key: string]: unknown }>;
  terms?: Array<{ term: Term | null }>;
  files?: Array<{ id: string; pdfUrl: string; hashContract: string | null }>;
};

interface ServicePriceReference {
  id: string;
  price: unknown;
  service?: { name?: string | null } | null;
}

interface RoomReference {
  id: string;
  roomNumber?: string | null;
}

@Injectable()
export class ProviderContractsService {
  private readonly logger = new Logger(ProviderContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
    private readonly configService: ConfigService,
    private readonly pdfRenderer: ContractPdfRendererService,
  ) {}

  /**
   * Validates if a customer exists by calling Identity Service via RPC.
   */
  private async checkCustomer(customerId: string): Promise<CustomerIdentity> {
    try {
      const response = await this.secureRpc.send<CustomerIdentity>(
        this.identityClient,
        { cmd: ProviderIdentityPatterns.GET_CUSTOMER_BY_ID },
        { customerId }
      );
      if (!response) {
        throw new RpcException({ statusCode: 404, message: 'Customer not found' });
      }
      return response;
    } catch (error) {
      this.logger.error(`Failed to validate customer ID: ${customerId}`, error.stack);
      throw new RpcException({ statusCode: 400, message: 'Failed to validate customer' });
    }
  }

  /**
   * Generates a unique contract number.
   */
  private async generateContractNumber(): Promise<string> {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `HD-${timestamp}-${random}`;
  }

  /**
   * Creates a new contract with associated services and terms.
   */
  async createContract(providerId: string, dto: CreateContractPayload): Promise<Contract> {
    this.logger.log(`Creating new contract for customer: ${dto.customerId}`);
    await this.checkCustomer(dto.customerId);

    if (dto.roomId) {
      try {
        const rooms = await this.secureRpc.send<any>(
          this.catalogClient,
          { cmd: ProviderBillingPatterns.CATALOG_ROOMS_BY_IDS },
          [dto.roomId]
        );
        if (!rooms || rooms.length === 0 || rooms[0].id !== dto.roomId) {
          throw new RpcException({ statusCode: 404, message: 'Room not found' });
        }
      } catch (error) {
        throw new RpcException({ statusCode: 400, message: 'Invalid room ID' });
      }
    }

    let finalServices = dto.services || [];
    if (dto.services && dto.services.length > 0) {
      const ids = [...new Set(dto.services.map((s) => s.servicePriceId))];
      try {
        const prices = await this.secureRpc.send<any[]>(
          this.catalogClient,
          { cmd: CatalogPatterns.SERVICES_PRICES_FIND_FOR_PROVIDER },
          { providerId, priceIds: ids },
          10000,
        );
        if (!prices || prices.length !== ids.length) {
          throw new RpcException({ statusCode: 400, message: 'Có dịch vụ không hợp lệ hoặc không thuộc nhà cung cấp.' });
        }

        const currentPriceIds = new Set(ids);
        const resolvedServices = [...dto.services];

        for (const priceItem of prices) {
          for (const req of priceItem.service?.requirements || []) {
            const additionalPrice = req.additionalService?.prices?.[0];
            if (additionalPrice && !currentPriceIds.has(additionalPrice.id)) {
              currentPriceIds.add(additionalPrice.id);
              resolvedServices.push({
                servicePriceId: additionalPrice.id,
                quantity: 1,
              });
              this.logger.log(
                `[createContract] Tự động bổ sung dịch vụ đi kèm bắt buộc: "${req.additionalService.name}" (${additionalPrice.id}) cho dịch vụ "${priceItem.service.name}"`,
              );
            }
          }
        }
        finalServices = resolvedServices;
      } catch (error: any) {
        if (error instanceof RpcException) throw error;
        this.logger.warn(`Could not validate/resolve accompanying services: ${error?.message || error}`);
      }
    }

    const contractNumber = await this.generateContractNumber();
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    if (dto.templateId) await this.ensureTemplateAvailable(providerId, dto.templateId);

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          contractNumber,
          providerId,
          customerId: dto.customerId,
          roomId: dto.roomId,
          status: ContractStatus.DRAFT,
          startDate,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          requireSignature: dto.requireSignature ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
          services: finalServices.length ? {
            create: finalServices.map(s => ({
              servicePriceId: s.servicePriceId,
              quantity: s.quantity || 1,
              createdAt: new Date()
            }))
          } : undefined,
          terms: dto.termIds?.length ? {
            create: dto.termIds.map(termId => ({ termId, createdAt: new Date() }))
          } : undefined
        },
        include: { services: true, terms: true }
      });

      return contract;
    });
  }

  /**
   * Updates an existing draft contract.
   */
  async updateContract(providerId: string, contractId: string, dto: UpdateContractPayload): Promise<ContractWithRelations> {
    this.logger.log(`Updating contract: ${contractId}`);
    const existing = await this.prisma.contract.findFirst({ where: { id: contractId, providerId } });
    
    if (!existing) {
      throw new RpcException({ statusCode: 404, message: 'Contract not found' });
    }
    if (existing.status !== ContractStatus.DRAFT && existing.status !== ContractStatus.PENDING_SIGNATURE) {
      throw new RpcException({ statusCode: 400, message: 'Chỉ có thể chỉnh sửa hợp đồng ở trạng thái bản nháp hoặc chờ ký.' });
    }

    if (dto.roomId) {
      const rooms = await this.secureRpc.send<{ id: string }[]>(
        this.catalogClient, { cmd: CatalogPatterns.ROOMS_FIND_BY_IDS_FOR_PROVIDER }, { providerId, roomIds: [dto.roomId] },
      );
      if (rooms.length !== 1) throw new RpcException({ statusCode: 400, message: 'Phòng không thuộc nhà cung cấp.' });
    }
    let finalServices = dto.services;
    if (dto.services !== undefined) {
      const ids = [...new Set(dto.services.map((service) => service.servicePriceId))];
      if (!ids.length || ids.length !== dto.services.length) throw new RpcException({ statusCode: 400, message: 'Dịch vụ hợp đồng không hợp lệ.' });

      // Tự động kiểm tra và thêm các dịch vụ đi kèm bắt buộc từ catalog-service
      try {
        const prices = await this.secureRpc.send<any[]>(
          this.catalogClient,
          { cmd: CatalogPatterns.SERVICES_PRICES_FIND_FOR_PROVIDER },
          { providerId, priceIds: ids },
          10000,
        );

        const currentPriceIds = new Set(ids);
        const resolvedServices = [...dto.services];

        for (const priceItem of prices || []) {
          for (const req of priceItem.service?.requirements || []) {
            const additionalPrice = req.additionalService?.prices?.[0];
            if (additionalPrice && !currentPriceIds.has(additionalPrice.id)) {
              currentPriceIds.add(additionalPrice.id);
              resolvedServices.push({
                servicePriceId: additionalPrice.id,
                quantity: 1,
              });
              this.logger.log(
                `[updateContract] Tự động bổ sung dịch vụ đi kèm bắt buộc: "${req.additionalService.name}" (${additionalPrice.id}) cho dịch vụ "${priceItem.service.name}"`,
              );
            }
          }
        }
        finalServices = resolvedServices;
      } catch (err: any) {
        this.logger.warn(`Could not resolve required accompanying services: ${err?.message || err}`);
      }
    }
    if (dto.termIds !== undefined) {
      const ids = [...new Set(dto.termIds)];
      if (ids.length !== dto.termIds.length) throw new RpcException({ statusCode: 400, message: 'Điều khoản hợp đồng không hợp lệ.' });
      const count = await this.prisma.term.count({ where: { id: { in: ids }, status: 'ACTIVE' } });
      if (count !== ids.length) throw new RpcException({ statusCode: 400, message: 'Có điều khoản không còn hiệu lực.' });
    }
    if (dto.templateId !== undefined) await this.ensureTemplateAvailable(providerId, dto.templateId);

    const contractNumber = existing.contractNumber.startsWith('YCDV-')
      ? await this.generateContractNumber()
      : existing.contractNumber;

    const nextStatus = (finalServices !== undefined && finalServices.length > 0)
      ? ((dto.requireSignature ?? (dto.requireSignature !== undefined ? dto.requireSignature : existing.requireSignature))
          ? ContractStatus.PENDING_SIGNATURE
          : ContractStatus.ACTIVE)
      : undefined;

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        ...(nextStatus && { status: nextStatus }),
        ...(dto.roomId !== undefined && { roomId: dto.roomId }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.requireSignature !== undefined && { requireSignature: dto.requireSignature }),
        ...(contractNumber !== existing.contractNumber && { contractNumber }),
        updatedAt: new Date(),
        ...(finalServices !== undefined && {
          services: {
            deleteMany: {},
            create: finalServices.map((service) => ({
              servicePriceId: service.servicePriceId,
              quantity: service.quantity ?? 1,
              createdAt: new Date(),
            })),
          },
        }),
        ...(dto.termIds !== undefined && {
          terms: { deleteMany: {}, create: dto.termIds.map((termId) => ({ termId, createdAt: new Date() })) },
        }),
      },
      include: { services: true, terms: { include: { term: true } }, files: true },
    });

    // Khi Provider hoàn thiện bản nháp (truyền services/startDate):
    // Tự động tạo file PDF, băm SHA-256
    if (finalServices !== undefined && finalServices.length > 0) {
      try {
        const file = await this.createSigningFile(providerId, contractId, updated);

        void this.secureRpc.send(
          this.notificationClient,
          { cmd: NotificationPatterns.CREATE_IN_APP },
          {
            userId: existing.customerId,
            providerId,
            title: updated.requireSignature ? 'Nhà cung cấp đã gửi hợp đồng để ký' : 'Hợp đồng dịch vụ đã kích hoạt',
            content: `Nhà cung cấp đã hoàn thiện hợp đồng. Số hợp đồng: ${contractNumber}.${updated.requireSignature ? ' Vui lòng kiểm tra và ký hợp đồng.' : ''}`,
          },
        ).catch(() => {});

        return {
          ...updated,
          files: file ? [file] : updated.files,
        };
      } catch (err: any) {
        this.logger.error(`Error finalizing contract PDF: ${err?.message || err}`);
      }
    }

    return updated;
  }

  /**
   * Transitions a contract to PENDING_SIGNATURE or ACTIVE depending on requireSignature.
   * Generates real PDF snapshot and computes cryptographic SHA-256 hash.
   */
  async sendContract(providerId: string, contractId: string): Promise<Contract> {
    this.logger.log(`Sending contract: ${contractId}`);
    const existing = await this.prisma.contract.findFirst({ where: { id: contractId, providerId } });
    
    if (!existing) throw new RpcException({ statusCode: 404, message: 'Contract not found' });
    if (existing.status !== ContractStatus.DRAFT) {
      throw new RpcException({ statusCode: 400, message: 'Invalid status for send' });
    }
    if (existing.contractNumber.startsWith('YCDV-')) {
      throw new RpcException({ statusCode: 400, message: 'Cần hoàn thiện bản nháp trước khi gửi hợp đồng.' });
    }

    // Luôn sinh snapshot PDF chính thức của hợp đồng và tính mã hash SHA-256
    await this.createSigningFile(providerId, contractId);

    const nextStatus = existing.requireSignature
      ? ContractStatus.PENDING_SIGNATURE
      : ContractStatus.ACTIVE;

    const contract = await this.prisma.contract.update({
      where: { id: contractId },
      data: { status: nextStatus, updatedAt: new Date() },
      include: { services: true, terms: true, files: true }
    });

    await this.secureRpc.send(
      this.notificationClient,
      { cmd: NotificationPatterns.CREATE_IN_APP },
      {
        userId: contract.customerId,
        providerId,
        title: existing.requireSignature ? 'Nhà cung cấp đã gửi hợp đồng để ký' : 'Hợp đồng dịch vụ đã kích hoạt',
        content: `Nhà cung cấp đã hoàn thiện hợp đồng. Số hợp đồng: ${contract.contractNumber}.${existing.requireSignature ? ' Vui lòng kiểm tra và ký hợp đồng.' : ''}`,
      },
    );
    return contract;
  }

  async findSigningFile(providerId: string, contractId: string) {
    const file = await this.prisma.contractFile.findFirst({
      where: { contractId, contract: { providerId } },
      orderBy: { id: 'desc' },
      select: { id: true, pdfUrl: true, hashContract: true },
    });
    if (!file) throw new RpcException({ statusCode: 404, message: 'Hợp đồng chưa có file để ký.' });
    return file;
  }

  private async createSigningFile(providerId: string, contractId: string, existingContract?: any) {
    const contract = existingContract || await this.prisma.contract.findFirst({
      where: { id: contractId, providerId },
      include: { services: true, terms: { include: { term: true } }, files: true },
    });
    if (!contract) throw new RpcException({ statusCode: 404, message: 'Contract not found' });

    // 1. Chạy song song các RPC calls để tải đầy đủ thông tin bên A, bên B, phòng và giá dịch vụ
    const priceIds = contract.services.map((s) => s.servicePriceId);
    const [priceList, providerInfo, customerInfo, rooms] = await Promise.all([
      priceIds.length > 0
        ? this.secureRpc.send<any[]>(
            this.catalogClient,
            { cmd: CatalogPatterns.SERVICES_PRICES_FIND_FOR_PROVIDER },
            { providerId, priceIds },
            20000,
          ).catch((err) => {
            this.logger.warn(`Could not load price info via findForProvider: ${err?.message || err}`);
            return [];
          })
        : Promise.resolve([]),
      this.secureRpc.send<any>(
        this.identityClient,
        { cmd: ProviderIdentityPatterns.GET_BY_ID },
        providerId,
        20000,
      ).catch((err) => {
        this.logger.warn(`Could not fetch provider profile: ${err?.message || err}`);
        return {};
      }),
      this.secureRpc.send<any>(
        this.identityClient,
        { cmd: CustomerPatterns.GET_CUSTOMER_INFORMATION },
        { customerId: contract.customerId },
        20000,
      ).catch((err) => {
        this.logger.warn(`Could not fetch customer info: ${err?.message || err}`);
        return {};
      }),
      contract.roomId
        ? this.secureRpc.send<any[]>(
            this.catalogClient,
            { cmd: CatalogPatterns.ROOMS_FIND_BY_IDS_FOR_PROVIDER },
            { providerId, roomIds: [contract.roomId] },
            20000,
          ).catch((err) => {
            this.logger.warn(`Could not fetch room info: ${err?.message || err}`);
            return [];
          })
        : Promise.resolve([]),
    ]);

    const priceMap = new Map((priceList || []).map((p: any) => [p.id, p]));

    const serviceItems: Array<{
      name: string;
      quantity: number | string;
      unitPrice: number | string;
      totalPrice: number | string;
      contractTemplateId?: string | null;
    }> = [];
    let totalMonthlyPrice = 0;

    contract.services.forEach((s) => {
      const priceInfo = priceMap.get(s.servicePriceId);
      const qty = s.quantity ? Number(s.quantity) : 1;
      const unitPrice = Number(priceInfo?.price || 0);
      const lineTotal = unitPrice * qty;
      totalMonthlyPrice += lineTotal;
      serviceItems.push({
        name: priceInfo?.service?.name || 'Dịch vụ',
        quantity: qty,
        unitPrice,
        totalPrice: lineTotal,
        contractTemplateId: priceInfo?.service?.contractTemplateId,
      });
    });

    const roomInfo = rooms && rooms.length > 0 ? {
      roomNumber: rooms[0].roomNumber || rooms[0].name,
      propertyName: rooms[0].property?.propertyName || rooms[0].propertyName,
      address: rooms[0].property?.address || rooms[0].address,
    } : null;

    // 2. Xác định ContractTemplate được gán cho dịch vụ hoặc mặc định theo loại
    const templateId = serviceItems.find((s) => s.contractTemplateId)?.contractTemplateId;
    let template: any = null;
    if (templateId) {
      template = await this.prisma.contractTemplate.findUnique({ where: { id: templateId } });
    }
    if (!template) {
      if (contract.roomId) {
        template = await this.prisma.contractTemplate.findFirst({
          where: {
            OR: [
              { name: { contains: 'nhà ở', mode: 'insensitive' } },
              { name: { contains: 'thuê', mode: 'insensitive' } },
            ],
            status: 'ACTIVE',
          },
        });
      } else {
        template = await this.prisma.contractTemplate.findFirst({
          where: {
            OR: [
              { name: { contains: 'dịch vụ', mode: 'insensitive' } },
            ],
            status: 'ACTIVE',
          },
        });
      }
      if (!template) {
        template = await this.prisma.contractTemplate.findFirst({ where: { status: 'ACTIVE' } });
      }
    }

    // 6. Render file PDF thực sự theo template JSON và dữ liệu động
    const pdfBuffer = await this.pdfRenderer.renderContractPdf({
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        startDate: contract.startDate,
        endDate: contract.endDate,
        requireSignature: contract.requireSignature,
        roomId: contract.roomId,
        status: contract.status,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        signedAt: contract.signedAt,
      },
      template: template ? {
        id: template.id,
        name: template.name,
        content: template.content,
      } : null,
      provider: {
        id: providerId,
        name: providerInfo?.companyName || providerInfo?.providerName || 'Nhà cung cấp',
        businessType: providerInfo?.businessType,
        companyName: providerInfo?.companyName,
        taxCode: providerInfo?.taxCode || providerInfo?.businessLicenseNumber,
        businessLicenseNumber: providerInfo?.businessLicenseNumber,
        representativeName: providerInfo?.representativeName,
        representativePosition: providerInfo?.representativePosition,
        address: providerInfo?.address,
        phone: providerInfo?.phone,
        email: providerInfo?.email,
        accountNumber: providerInfo?.accountNumber,
        bankName: providerInfo?.bankName,
      },
      customer: {
        id: contract.customerId,
        name: customerInfo?.fullName || customerInfo?.name || 'Khách hàng',
        cccd: customerInfo?.identityCardNumber || customerInfo?.cccd,
        address: customerInfo?.address,
        phone: customerInfo?.phone,
        email: customerInfo?.email,
      },
      services: serviceItems,
      terms: contract.terms.map((item) => ({ id: item.term.id, content: item.term.content })),
      room: roomInfo,
      totalMonthlyPrice,
      depositAmount: 0,
    });

    // 7. Tính mã băm cryptographic SHA-256 trên buffer file PDF thật sự
    const hashContract = createHash('sha256').update(pdfBuffer).digest('hex');

    // 8. Upload file .pdf thật lên Cloudinary
    const pdfUrl = await this.uploadContractSnapshot(contract.contractNumber, pdfBuffer);

    // 9. Lưu bản ghi ContractFile
    const existingFile = (contract as any)?.files?.[0] || await this.prisma.contractFile.findFirst({
      where: { contractId },
      orderBy: { id: 'desc' },
    });

    if (existingFile) {
      return this.prisma.contractFile.update({
        where: { id: existingFile.id },
        data: { pdfUrl, hashContract },
      });
    }

    return this.prisma.contractFile.create({ data: { contractId, pdfUrl, hashContract } });
  }

  private async uploadContractSnapshot(contractNumber: string, content: Buffer): Promise<string> {
    const creds = this.getCloudinaryCredentials();
    if (creds) {
      try {
        const { cloudName, apiKey, apiSecret } = creds;
        const timestamp = Math.floor(Date.now() / 1000);
        const publicId = `servicehub/contracts/${contractNumber}-${timestamp}.pdf`;
        const signature = createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest('hex');
        const form = new FormData();
        form.set('file', new Blob([Uint8Array.from(content)], { type: 'application/pdf' }), `${contractNumber}.pdf`);
        form.set('public_id', publicId);
        form.set('timestamp', String(timestamp));
        form.set('api_key', apiKey);
        form.set('signature', signature);
        form.set('resource_type', 'raw');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(1500),
        });
        if (response.ok) {
          const payload = await response.json() as { secure_url?: string };
          if (payload.secure_url) return payload.secure_url;
        }
        this.logger.warn(`Cloudinary upload returned status ${response.status}, falling back to Data URI`);
      } catch (err: any) {
        this.logger.warn(`Cloudinary upload failed: ${err?.message || err}, falling back to Data URI`);
      }
    }
    // Fallback: return base64 Data URI for the generated PDF document
    return `data:application/pdf;base64,${content.toString('base64')}`;
  }

  private getCloudinaryCredentials(): { cloudName: string; apiKey: string; apiSecret: string } | null {
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL');
    if (!cloudinaryUrl) {
      return null;
    }

    try {
      const parsed = new URL(cloudinaryUrl);
      if (parsed.protocol !== 'cloudinary:' || !parsed.hostname || !parsed.username || !parsed.password) {
        return null;
      }

      return {
        cloudName: parsed.hostname,
        apiKey: decodeURIComponent(parsed.username),
        apiSecret: decodeURIComponent(parsed.password),
      };
    } catch {
      return null;
    }
  }

  /**
   * Transitions a contract from PENDING_SIGNATURE back to DRAFT.
   */
  async revokeContract(providerId: string, contractId: string, reason?: string): Promise<Contract> {
    this.logger.log(`Revoking contract: ${contractId}. Reason: ${reason}`);
    const existing = await this.prisma.contract.findFirst({ where: { id: contractId, providerId } });
    
    if (!existing) throw new RpcException({ statusCode: 404, message: 'Contract not found' });
    if (existing.status !== ContractStatus.PENDING_SIGNATURE) {
      throw new RpcException({ statusCode: 400, message: 'Invalid status for revoke' });
    }

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.DRAFT, updatedAt: new Date() }
    });
  }

  /**
   * Cancels a contract regardless of its state.
   */
  async cancelContract(providerId: string, contractId: string, reason?: string): Promise<Contract> {
    this.logger.log(`Cancelling contract: ${contractId}. Reason: ${reason}`);
    const normalizedReason = reason?.trim();
    if (!normalizedReason) {
      throw new RpcException({ statusCode: 400, message: 'Vui lòng nhập lý do từ chối cung cấp dịch vụ.' });
    }
    if (normalizedReason.length > 2000) {
      throw new RpcException({ statusCode: 400, message: 'Lý do từ chối không được vượt quá 2000 ký tự.' });
    }
    const existing = await this.prisma.contract.findFirst({ where: { id: contractId, providerId } });
    if (!existing) throw new RpcException({ statusCode: 404, message: 'Contract not found' });
    if (existing.status !== ContractStatus.DRAFT) {
      throw new RpcException({ statusCode: 400, message: 'Chỉ có thể từ chối yêu cầu dịch vụ đang ở trạng thái nháp.' });
    }

    const contract = await this.prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.CANCELLED, updatedAt: new Date() }
    });
    await this.secureRpc.send(
      this.notificationClient,
      { cmd: NotificationPatterns.CREATE_IN_APP },
      {
        userId: contract.customerId,
        providerId,
        title: 'Nhà cung cấp từ chối cung cấp dịch vụ',
        content: `Yêu cầu dịch vụ ${contract.contractNumber} đã bị từ chối. Lý do: ${normalizedReason}`,
      },
    );
    return contract;
  }

  /** Enriches an entire page with bounded, provider-scoped RPC calls. */
  private async enrichContractsData(contracts: ContractWithRelations[]): Promise<EnrichedContract[]> {
    if (contracts.length === 0) return [];

    const providerId = contracts[0].providerId;
    const customerIds = [...new Set(contracts.map((contract) => contract.customerId))];
    const roomIds = [...new Set(contracts.flatMap((contract) => contract.roomId ? [contract.roomId] : []))];
    const priceIds = [...new Set(contracts.flatMap((contract) => contract.services.map((service) => service.servicePriceId)))];
    const [identities, rooms, prices] = await Promise.all([
      customerIds.length > 0
        ? this.secureRpc.send<any[]>(
            this.identityClient,
            { cmd: ProviderIdentityPatterns.IDENTITIES_BATCH },
            { identityIds: customerIds },
          ).catch(() => [])
        : [],
      roomIds.length > 0
        ? this.secureRpc.send<any[]>(
            this.catalogClient,
            { cmd: CatalogPatterns.ROOMS_FIND_BY_IDS_FOR_PROVIDER },
            { providerId, roomIds },
          ).catch(() => [])
        : [],
      priceIds.length > 0
        ? this.secureRpc.send<any[]>(
            this.catalogClient,
            { cmd: CatalogPatterns.SERVICES_PRICES_FIND_FOR_PROVIDER },
            { providerId, priceIds },
          ).catch(() => [])
        : [],
    ]);
    const identitiesById = new Map(identities.map((identity) => [identity.id, identity] as const));
    const roomsById = new Map(rooms.map((room) => [room.id, room] as const));
    const pricesById = new Map(prices.map((price) => [price.id, price] as const));

    return contracts.map((contract) => {
      const customer = identitiesById.get(contract.customerId);
      const room = contract.roomId ? roomsById.get(contract.roomId) : undefined;
      return {
        ...contract,
        customerName: customer?.fullName || customer?.email || customer?.phone || 'Khách hàng',
        customerPhone: customer?.phone || '',
        roomName: room?.roomNumber || (contract.roomId ? 'Chưa xếp phòng' : null),
        services: contract.services.map((service) => {
          const price = pricesById.get(service.servicePriceId);
          return {
            ...service,
            serviceName: price?.service?.name || 'Chưa có tên dịch vụ',
            price: Number(price?.price ?? 0),
          };
        }),
        terms: contract.terms?.map((item) => item.term).filter((term): term is Term => term !== null),
      } as EnrichedContract;
    });
  }

  /**
   * Finds contracts based on query parameters.
   */
  async findContracts(query: ContractQueryPayload): Promise<EnrichedContract[]> {
    this.logger.log(`Fetching contracts with query: ${JSON.stringify(query)}`);
    const { providerId, status, page = 1, limit = 10 } = query;
    const contracts = await this.prisma.contract.findMany({
      where: {
        providerId,
        ...(status ? { status: status as ContractStatus } : {})
      },
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      include: { services: true, terms: { include: { term: true } }, files: { orderBy: { id: 'desc' }, take: 1 } }
    });

    return this.enrichContractsData(contracts);
  }
  
  /**
   * Retrieves a specific contract and enriches it.
   */
  async findOneContract(providerId: string, contractId: string): Promise<EnrichedContract> {
    this.logger.log(`Fetching contract details for ID: ${contractId}`);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, providerId },
      include: { services: true, terms: { include: { term: true } }, files: { orderBy: { id: 'desc' }, take: 1 } }
    });
    
    if (!contract) throw new RpcException({ statusCode: 404, message: 'Contract not found' });
    
    return (await this.enrichContractsData([contract]))[0];
  }

  async findDraftByRequestNumber(providerId: string, contractNumber: string): Promise<EnrichedContract> {
    const contract = await this.prisma.contract.findFirst({
      where: { providerId, contractNumber, status: ContractStatus.DRAFT },
      include: { services: true, terms: { include: { term: true } }, files: { orderBy: { id: 'desc' }, take: 1 } },
    });
    if (!contract) throw new RpcException({ statusCode: 404, message: 'Không tìm thấy yêu cầu dịch vụ.' });
    return (await this.enrichContractsData([contract]))[0];
  }

  /**
   * Retrieves all templates for a provider.
   */
  async findTemplates(providerId: string): Promise<ContractTemplate[]> {
    return this.prisma.contractTemplate.findMany({
      where: {
        OR: [{ providerId }, { providerId: null }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a specific template.
   */
  async findTemplate(providerId: string, templateId: string): Promise<ContractTemplate> {
    const template = await this.prisma.contractTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ providerId }, { providerId: null }],
      }
    });
    if (!template) throw new RpcException({ statusCode: 404, message: 'Template not found' });
    return template;
  }

  private async ensureTemplateAvailable(providerId: string, templateId: string): Promise<void> {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { id: templateId, OR: [{ providerId }, { providerId: null }] },
      select: { id: true },
    });
    if (!template) throw new RpcException({ statusCode: 400, message: 'Mẫu hợp đồng không thuộc nhà cung cấp.' });
  }

  /**
   * Retrieves all terms (globally available).
   */
  async findTerms(providerId: string): Promise<Term[]> {
    return this.prisma.term.findMany();
  }

  async getContractsByIds(contractIds: string[]) {
    const contracts = await this.prisma.contract.findMany({
      where: { id: { in: contractIds } }
    });
    const map = {};
    for (const c of contracts) {
      map[c.id] = c;
    }
    return map;
  }

  async getContractsByIdsForProvider(providerId: string, contractIds: string[]) {
    if (contractIds.length === 0) return {};

    const contracts = await this.prisma.contract.findMany({
      where: { providerId, id: { in: contractIds } },
      select: { id: true, customerId: true, roomId: true, contractNumber: true },
    });
    const customerIds = contracts.map((contract) => contract.customerId);
    const roomIds = contracts.flatMap((contract) => contract.roomId ? [contract.roomId] : []);
    const [identities, rooms] = await Promise.all([
      customerIds.length > 0
        ? this.secureRpc.send<CustomerIdentity[]>(
            this.identityClient,
            { cmd: ProviderIdentityPatterns.IDENTITIES_BATCH },
            { identityIds: customerIds },
          ).catch(() => [])
        : [],
      roomIds.length > 0
        ? this.secureRpc.send<any[]>(
            this.catalogClient,
            { cmd: CatalogPatterns.ROOMS_FIND_BY_IDS_FOR_PROVIDER },
            { providerId, roomIds },
          ).catch(() => [])
        : [],
    ]);
    const identitiesById = new Map<string, CustomerIdentity>(
      identities.map((identity) => [identity.id, identity] as const),
    );
    const roomsById = new Map<string, any>(rooms.map((room: any) => [room.id, room] as const));

    return Object.fromEntries(contracts.map((contract) => {
      const identity = identitiesById.get(contract.customerId);
      const room = contract.roomId ? roomsById.get(contract.roomId) : undefined;
      return [contract.id, {
        ...contract,
        customerName: identity?.fullName || identity?.email || identity?.phone || 'Khách hàng',
        roomName: room?.roomNumber || (contract.roomId ? 'Chưa xếp phòng' : null),
      }];
    }));
  }

  async findActiveContractsByRoomIds(providerId: string, roomIds: string[]) {
    if (roomIds.length === 0) return [];
    const contracts = await this.prisma.contract.findMany({
      where: { providerId, status: ContractStatus.ACTIVE, roomId: { in: roomIds } },
      select: { id: true, contractNumber: true, roomId: true, customerId: true, status: true, services: true },
    });
    const customerIds = [...new Set(contracts.map((c) => c.customerId))];
    const identities = customerIds.length > 0
      ? await this.secureRpc.send<CustomerIdentity[]>(
          this.identityClient,
          { cmd: ProviderIdentityPatterns.IDENTITIES_BATCH },
          { identityIds: customerIds },
        ).catch(() => [])
      : [];
    const identitiesById = new Map(identities.map((identity) => [identity.id, identity] as const));
    return contracts.map((contract) => {
      const customer = identitiesById.get(contract.customerId);
      return {
        ...contract,
        customerName: customer?.fullName || customer?.email || customer?.phone || 'Khách hàng',
        customerPhone: customer?.phone || '',
      };
    });
  }

  async hasRoomReferences(providerId: string, roomId: string) {
    const count = await this.prisma.contract.count({
      where: {
        providerId,
        roomId,
        status: { in: [ContractStatus.DRAFT, ContractStatus.PENDING_SIGNATURE, ContractStatus.ACTIVE] },
      },
    });
    return { hasReferences: count > 0 };
  }

  async findRestrictions(providerId: string, status?: 'ACTIVE' | 'LIFTED') {
    const restrictions = await this.prisma.restriction.findMany({
      where: {
        providerId,
        scopeType: 'PROVIDER',
        isDeleted: false,
        ...(status === 'ACTIVE' ? { endAt: null } : status === 'LIFTED' ? { endAt: { not: null } } : {}),
      },
      select: {
        id: true,
        customerId: true,
        reason: true,
        startAt: true,
        endAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const customerIds = [...new Set(restrictions.flatMap((restriction) => restriction.customerId ? [restriction.customerId] : []))];
    const identities = customerIds.length > 0
      ? await this.secureRpc.send<CustomerIdentity[]>(
          this.identityClient,
          { cmd: ProviderIdentityPatterns.IDENTITIES_BATCH },
          { identityIds: customerIds },
        ).catch(() => [])
      : [];
    const identitiesById = new Map(identities.map((identity) => [identity.id, identity]));

    return restrictions.map((restriction) => {
      const identity = restriction.customerId ? identitiesById.get(restriction.customerId) : undefined;
      return {
        ...restriction,
        status: restriction.endAt ? 'LIFTED' : 'ACTIVE',
        customerName: identity?.fullName || identity?.email || identity?.phone || 'Khách hàng',
        customerPhone: identity?.phone || '',
      };
    });
  }

  async liftRestriction(providerId: string, restrictionId: string) {
    const now = new Date();
    const result = await this.prisma.restriction.updateMany({
      where: {
        id: restrictionId,
        providerId,
        scopeType: 'PROVIDER',
        isDeleted: false,
        endAt: null,
      },
      data: { endAt: now, updatedAt: now },
    });
    if (result.count !== 1) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy lệnh chặn đang hiệu lực' });
    }
    return { success: true };
  }

  async blockCustomer(payload: { providerId: string; customerId: string; reason: string; blockBy: string; contractId?: string }) {
    this.logger.log(`Provider ${payload.providerId} blocking customer ${payload.customerId} with reason: ${payload.reason}`);

    return this.prisma.$transaction(async (tx) => {
      // Find contract to link the violation
      let targetContract;
      if (payload.contractId) {
        targetContract = await tx.contract.findFirst({
          where: { id: payload.contractId, providerId: payload.providerId, customerId: payload.customerId }
        });
      } else {
        targetContract = await tx.contract.findFirst({
          where: { providerId: payload.providerId, customerId: payload.customerId },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!targetContract) {
        throw new RpcException({ statusCode: 400, message: 'Customer has no matching contracts with this provider' });
      }

      // Check if already restricted
      const existingRestriction = await tx.restriction.findFirst({
        where: { 
          providerId: payload.providerId, 
          customerId: payload.customerId,
          scopeType: 'PROVIDER',
          isDeleted: false,
          OR: [
            { endAt: null },
            { endAt: { gt: new Date() } }
          ]
        }
      });

      if (existingRestriction) {
        throw new RpcException({ statusCode: 400, message: 'Customer is already blocked' });
      }

      let rule = await tx.violationRule.findFirst({
        where: { name: 'Không còn hợp đồng hiệu lực - Provider tự chặn' }
      });
      
      if (!rule) {
        rule = await tx.violationRule.create({
          data: {
            name: 'Không còn hợp đồng hiệu lực - Provider tự chặn',
            targetType: 'CUSTOMER',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
      }

      const violationCase = await tx.violationCase.create({
        data: {
          violationRuleId: rule.id,
          contractId: targetContract.id,
          providerId: payload.providerId,
          reportedBy: payload.blockBy,
          status: 'RESOLVED',
          description: payload.reason,
          occurredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          actions: {
            create: {
              performedBy: payload.blockBy,
              actionType: 'RESTRICT',
              reason: payload.reason,
              createdAt: new Date(),
              restrictions: {
                create: {
                  providerId: payload.providerId,
                  customerId: payload.customerId,
                  scopeType: 'PROVIDER',
                  reason: payload.reason,
                  startAt: new Date(),
                  createdBy: payload.blockBy,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
              }
            }
          }
        }
      });
      return { success: true, violationCase };
    }, { isolationLevel: 'Serializable' });
  }

  async getDashboardStats(providerId: string) {
    const [activeContracts, pendingRequests] = await Promise.all([
      this.prisma.contract.count({
        where: { providerId, status: 'ACTIVE' }
      }),
      this.prisma.contract.count({
        where: { providerId, status: 'PENDING_SIGNATURE' }
      })
    ]);

    return { activeContracts, pendingRequests };
  }

  async getStatusDistribution(providerId: string) {
    const stats = await this.prisma.contract.groupBy({
      by: ['status'],
      where: { providerId },
      _count: { id: true },
    });

    let active = 0, pending = 0, churn = 0;
    stats.forEach((s) => {
      if (s.status === 'ACTIVE') active += s._count.id;
      if (s.status === 'PENDING_SIGNATURE' || s.status === 'DRAFT') pending += s._count.id;
      if (s.status === 'EXPIRED' || s.status === 'TERMINATED' || s.status === 'CANCELLED') churn += s._count.id;
    });

    const total = active + pending + churn;
    if (total === 0) return { active: 0, pending: 0, churn: 0 };

    return {
      active: Math.round((active / total) * 100),
      pending: Math.round((pending / total) * 100),
      churn: Math.round((churn / total) * 100),
    };
  }

  async getExpiringContracts(providerId: string) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const expiring = await this.prisma.contract.findMany({
      where: {
        providerId,
        status: 'ACTIVE',
        endDate: { lte: nextMonth, not: null },
      },
      select: { contractNumber: true, endDate: true },
    });
    return expiring;
  }

  async getRecentContracts(providerId: string) {
    const contracts = await this.prisma.contract.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return contracts.map((c) => ({
      id: c.id,
      customerName: 'Khách hàng',
      roomName: c.roomId ? 'Phòng ' + c.roomId.slice(-3) : 'Chưa xếp phòng',
      startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : 'N/A',
      status: c.status,
    }));
  }

  async findCustomersByProvider(providerId: string, options?: { status?: string; page?: number; limit?: number; search?: string }) {
    const page = options?.page || 1;
    const limit = options?.limit || 10;

    const contracts = await this.prisma.contract.findMany({
      where: { providerId },
      distinct: ['customerId'],
      orderBy: [
        { customerId: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        contractNumber: true,
        customerId: true,
        roomId: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    let results = contracts.map((contract) => ({
      id: contract.customerId,
      name: 'Khách hàng',
      phone: '',
      contractId: contract.id,
      room: contract.roomId ? 'Phòng ' + contract.roomId.slice(-3) : 'Chưa xếp phòng',
      status: contract.status,
      joinDate: contract.startDate,
    }));

    if (options?.search) {
      const search = options.search.toLowerCase();
      results = results.filter((r) => r.name.toLowerCase().includes(search) || r.phone.includes(search));
    }

    if (options?.status && options.status !== 'ALL') {
      results = results.filter((r) => r.status === options.status);
    }

    const total = results.length;
    const paginated = results.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
