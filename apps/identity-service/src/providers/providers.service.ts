import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { ProviderRpcSummary } from './dto/provider-rpc-summary.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { CreateProviderDto } from './dto/create-provider.dto';

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get the entire Provider profile along with legal documents.
   * Search by identityId (foreign key from Identity table).
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
   * Update Provider profile information.
   * Only nullable fields are allowed to be updated - cannot update providerType, status, identityId.
   */
  async updateProviderProfile(identityId: string, dto: UpdateProviderProfileDto) {
    this.logger.log(`Updating provider profile for identityId: ${identityId}`);

    // Ensure Provider exists before update
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
   * Find Provider by provider.id (PK).
   * Used for cross-service validation RPC from Catalog and Contract Service.
   * Returns ProviderRpcSummary - a compact payload, sufficient for validation.
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
   * Add a new legal document for Provider.
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


  /**
   * Get all provider profiles belonging to an identity.
   * Returns a compact list suitable for workspace-switcher UI.
   */
  async getMyProviders(identityId: string) {
    this.logger.log(`Fetching all providers for identityId: ${identityId}`);
    return this.prisma.provider.findMany({
      where: { identityId },
      select: {
        id: true,
        providerName: true,
        logoUrl: true,
        providerType: true,
        status: true,
        address: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Register a new provider profile under an existing identity.
   * providerType and businessType are required enum values from the schema.
   */
  async createProvider(identityId: string, dto: CreateProviderDto) {
    this.logger.log(`Creating new provider for identityId: ${identityId}, name: ${dto.providerName}`);

    // Ensure identity exists before creating a provider
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
    });

    if (!identity) {
      throw new RpcException({ status: 404, message: 'Identity not found' });
    }

    const now = new Date();
    const provider = await this.prisma.provider.create({
      data: {
        identityId,
        providerName: dto.providerName,
        providerType: dto.providerType,
        businessType: dto.businessType ?? 'INDIVIDUAL',
        address: dto.address,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      },
      select: {
        id: true,
        providerName: true,
        logoUrl: true,
        providerType: true,
        status: true,
        address: true,
      },
    });

    return provider;
  }

}
