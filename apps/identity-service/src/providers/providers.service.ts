import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { ProviderRpcSummary } from './dto/provider-rpc-summary.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Lấy toàn bộ hồ sơ Provider kèm giấy tờ pháp lý.
   * Tìm kiếm theo identityId (foreign key từ bảng Identity).
   */
  async getProviderProfile(identityId: string) {
    this.logger.log(`Fetching provider profile for identityId: ${identityId}`);

    const provider = await this.prisma.provider.findFirst({
      where: { identityId },
      include: { 
        legalDocuments: true,
        identity: {
          select: {
            email: true,
            phone: true,
            status: true,
            isEkycVerified: true,
            role: {
              select: {
                name: true,
              }
            }
          }
        }
      },
    });

    if (!provider) {
      throw new RpcException({
        status: 404,
        message: 'Provider profile not found',
      });
    }

    const systemSettings = {
      distanceWarningKm: parseInt(this.configService.get<string>('EXTERNAL_SERVICE_DISTANCE_WARNING_KM') || '5', 10),
    };

    return {
      ...provider,
      systemSettings,
    };
  }

  /**
   * Cập nhật thông tin hồ sơ Provider.
   * Chỉ cho phép sửa các field nullable – không cho sửa providerType, status, identityId.
   */
  async updateProviderProfile(identityId: string, dto: UpdateProviderProfileDto) {
    this.logger.log(`Updating provider profile for identityId: ${identityId}`);

    // Đảm bảo Provider tồn tại trước khi update
    const existing = await this.prisma.provider.findFirst({
      where: { identityId },
    });

    if (!existing) {
      throw new RpcException({
        status: 404,
        message: 'Provider profile not found',
      });
    }

    const updated = await this.prisma.provider.update({
      where: { id: existing.id },
      data: {
        providerName: dto.providerName,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        description: dto.description,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        companyName: dto.companyName,
        taxCode: dto.taxCode,
        businessLicenseNumber: dto.businessLicenseNumber,
        representativeName: dto.representativeName,
        representativePosition: dto.representativePosition,
        numberCard: dto.numberCard,
        nameBank: dto.nameBank,
        updatedAt: new Date(),
      },
      include: { legalDocuments: true },
    });

    return updated;
  }

  /**
   * Tìm Provider theo provider.id (PK).
   * Dùng cho RPC cross-service validation từ Catalog và Contract Service.
   * Trả về ProviderRpcSummary – payload nhỏ gọn, đủ để validate.
   */
  async getProviderById(providerId: string): Promise<ProviderRpcSummary> {
    this.logger.log(`[RPC] get.provider.by.id: ${providerId}`);

    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        identityId: true,
        providerName: true,
        providerType: true,
        status: true,
        address: true,
      },
    });

    if (!provider) {
      throw new RpcException({
        status: 404,
        message: `Provider ${providerId} not found`,
      });
    }

    return {
      id: provider.id,
      identityId: provider.identityId,
      providerName: provider.providerName,
      providerType: provider.providerType as ProviderRpcSummary['providerType'],
      status: provider.status as ProviderRpcSummary['status'],
      address: provider.address,
    };
  }

  /**
   * Thêm mới một giấy tờ pháp lý cho Provider.
   */
  async addLegalDocument(identityId: string, dto: CreateLegalDocumentDto) {
    this.logger.log(`Adding legal document for identityId: ${identityId}`);

    const provider = await this.prisma.provider.findFirst({
      where: { identityId },
    });

    if (!provider) {
      throw new RpcException({
        status: 404,
        message: 'Provider profile not found',
      });
    }

    return this.prisma.providerLegalDocument.create({
      data: {
        providerId: provider.id,
        documentType: dto.documentType,
        documentName: dto.documentName,
        documentNumber: dto.documentNumber,
        fileUrl: dto.fileUrl,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        verificationStatus: 'PENDING',
        createdAt: new Date(),
      },
    });
  }


}
