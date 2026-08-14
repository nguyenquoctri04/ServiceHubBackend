import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ContractStatus, Contract } from '@prisma/client-contract';
import { lastValueFrom, timeout, retry } from 'rxjs';
import { ProviderBillingPatterns } from '@app/common';
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
export interface UpdateContractPayload extends CreateContractPayload {}

/**
 * Payload interface for querying contracts.
 */
export interface ContractQueryPayload {
  status?: string;
  page?: string | number;
  limit?: string | number;
}

@Injectable()
export class ProviderContractsService {
  private readonly logger = new Logger(ProviderContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
  ) {}

  /**
   * Validates if a customer exists by calling Identity Service via RPC.
   */
  private async checkCustomer(customerId: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.identityClient.send({ cmd: 'get.customer.by.id' }, { customerId })
        .pipe(timeout(5000), retry({ count: 3, delay: 500 }))
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
        const rooms = await lastValueFrom(
          this.catalogClient.send({ cmd: ProviderBillingPatterns.CATALOG_ROOMS_BY_IDS }, [dto.roomId])
          .pipe(timeout(3000), retry({ count: 1 }))
        );
        if (!rooms || rooms.length === 0 || rooms[0].id !== dto.roomId) {
          throw new RpcException({ statusCode: 404, message: 'Room not found' });
        }
      } catch (error) {
        throw new RpcException({ statusCode: 400, message: 'Invalid room ID' });
      }
    }

    if (dto.services && dto.services.length > 0) {
      for (const s of dto.services) {
        try {
          const servicePrice = await lastValueFrom(
            this.catalogClient.send({ cmd: 'get.service.price.by.id' }, { servicePriceId: s.servicePriceId })
            .pipe(timeout(3000), retry({ count: 1 }))
          );
          if (!servicePrice) throw new Error();
        } catch (error) {
          throw new RpcException({ statusCode: 400, message: `Invalid servicePriceId: ${s.servicePriceId}` });
        }
      }
    }

    const contractNumber = await this.generateContractNumber();
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          contractNumber,
          customerId: dto.customerId,
          roomId: dto.roomId,
          status: ContractStatus.DRAFT,
          startDate,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          requireSignature: dto.requireSignature ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
          services: dto.services?.length ? {
            create: dto.services.map(s => ({
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
  async updateContract(providerId: string, contractId: string, dto: UpdateContractPayload): Promise<Contract> {
    this.logger.log(`Updating contract: ${contractId}`);
    const existing = await this.prisma.contract.findUnique({ where: { id: contractId } });
    
    if (!existing) {
      throw new RpcException({ statusCode: 404, message: 'Contract not found' });
    }
    if (existing.status !== ContractStatus.DRAFT) {
      throw new RpcException({ statusCode: 400, message: 'Only draft contracts can be updated' });
    }

    return this.prisma.contract.update({
      where: { id: contractId },
      data: {
        customerId: dto.customerId,
        roomId: dto.roomId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        requireSignature: dto.requireSignature,
        updatedAt: new Date(),
      }
    });
  }

  /**
   * Transitions a contract to PENDING_SIGNATURE.
   */
  async sendContract(providerId: string, contractId: string): Promise<Contract> {
    this.logger.log(`Sending contract for signature: ${contractId}`);
    const existing = await this.prisma.contract.findUnique({ where: { id: contractId } });
    
    if (!existing) throw new RpcException({ statusCode: 404, message: 'Contract not found' });
    if (existing.status !== ContractStatus.DRAFT) {
      throw new RpcException({ statusCode: 400, message: 'Invalid status for send' });
    }

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.PENDING_SIGNATURE, updatedAt: new Date() }
    });
  }

  /**
   * Transitions a contract from PENDING_SIGNATURE back to DRAFT.
   */
  async revokeContract(providerId: string, contractId: string, reason?: string): Promise<Contract> {
    this.logger.log(`Revoking contract: ${contractId}. Reason: ${reason}`);
    const existing = await this.prisma.contract.findUnique({ where: { id: contractId } });
    
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
    const existing = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!existing) throw new RpcException({ statusCode: 404, message: 'Contract not found' });

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.CANCELLED, updatedAt: new Date() }
    });
  }

  /**
   * Terminates an active contract.
   */
  async terminateContract(providerId: string, contractId: string, reason?: string): Promise<Contract> {
    this.logger.log(`Terminating contract: ${contractId}. Reason: ${reason}`);
    const existing = await this.prisma.contract.findUnique({ where: { id: contractId } });
    
    if (!existing) throw new RpcException({ statusCode: 404, message: 'Contract not found' });
    if (existing.status !== ContractStatus.ACTIVE) {
      throw new RpcException({ statusCode: 400, message: 'Only active contracts can be terminated' });
    }

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.TERMINATED, updatedAt: new Date() }
    });
  }

  /**
   * Enriches contract data by fetching external references (Customer, Services).
   */
  private async enrichContractData(contract: any): Promise<any> {
    try {
      const customer = await lastValueFrom(
        this.identityClient.send({ cmd: 'get.customer.by.id' }, { customerId: contract.customerId })
        .pipe(timeout(3000), retry({ count: 1 }))
      ).catch(() => null);

      const customerName = customer?.email || customer?.phone || contract.customerId;
      const customerPhone = customer?.phone || '';

      const enrichedServices = await Promise.all((contract.services || []).map(async (s: any) => {
        const priceDetail = await lastValueFrom(
          this.catalogClient.send({ cmd: 'get.service.price.by.id' }, { servicePriceId: s.servicePriceId })
          .pipe(timeout(3000), retry({ count: 1 }))
        ).catch(() => null);

        return {
          ...s,
          serviceName: priceDetail?.service?.name || 'Unknown Service',
          price: Number(priceDetail?.price || 0)
        };
      }));

      return {
        ...contract,
        customerName,
        customerPhone,
        roomName: 'Phòng ' + (contract.roomId ? contract.roomId.slice(-4) : 'Mới'),
        services: enrichedServices
      };
    } catch (error) {
      this.logger.warn(`Failed to enrich contract data for ID: ${contract.id}`, error.stack);
      return contract;
    }
  }

  /**
   * Finds contracts based on query parameters.
   */
  async findContracts(query: ContractQueryPayload): Promise<any[]> {
    this.logger.log(`Fetching contracts with query: ${JSON.stringify(query)}`);
    const { status, page = 1, limit = 10 } = query;
    const contracts = await this.prisma.contract.findMany({
      where: status ? { status: status as ContractStatus } : undefined,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      include: { services: true, terms: true }
    });

    return Promise.all(contracts.map(c => this.enrichContractData(c)));
  }
  
  /**
   * Retrieves a specific contract and enriches it.
   */
  async findOneContract(providerId: string, contractId: string): Promise<any> {
    this.logger.log(`Fetching contract details for ID: ${contractId}`);
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { services: true, terms: true }
    });
    
    if (!contract) throw new RpcException({ statusCode: 404, message: 'Contract not found' });
    
    return this.enrichContractData(contract);
  }

  /**
   * Retrieves all templates for a provider.
   */
  async findTemplates(providerId: string): Promise<any[]> {
    return this.prisma.contractTemplate.findMany({
      where: { providerId }
    });
  }

  /**
   * Retrieves a specific template.
   */
  async findTemplate(providerId: string, templateId: string): Promise<any> {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { id: templateId, providerId }
    });
    if (!template) throw new RpcException({ statusCode: 404, message: 'Template not found' });
    return template;
  }

  /**
   * Retrieves all terms (globally available).
   */
  async findTerms(providerId: string): Promise<any[]> {
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
}
