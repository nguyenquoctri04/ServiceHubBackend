import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { GatewayProxyService } from '../../proxy/gateway-proxy.service';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { ViolationQueryDto } from '../dto/contract.dto';

@Injectable()
export class ProviderContractBffService {
  constructor(
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
    @Inject('BILLING_SERVICE') private readonly billingClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
  ) {}
  async enrichContracts(providerId: string, contracts: any[]) {
    if (!contracts || contracts.length === 0) return [];
    
    const customerIds = [...new Set(contracts.map((c) => c.customerId).filter(Boolean))];
    const roomIds = [...new Set(contracts.flatMap((c) => c.roomId ? [c.roomId] : []).filter(Boolean))];
    const priceIds = [...new Set(contracts.flatMap((c) => c.services?.map((s: any) => s.servicePriceId) || []).filter(Boolean))];

    const [identities, rooms, prices] = await Promise.all([
      customerIds.length > 0 ? this.proxy.send<any[]>(this.identityClient, { cmd: 'provider.identities.batch' }, { identityIds: customerIds }).catch(() => []) : [],
      roomIds.length > 0 ? this.proxy.send<any[]>(this.catalogClient, { cmd: 'catalog.rooms.findByIdsForProvider' }, { providerId, roomIds }).catch(() => []) : [],
      priceIds.length > 0 ? this.proxy.send<any[]>(this.catalogClient, { cmd: 'services.prices.findForProvider' }, { providerId, priceIds }).catch(() => []) : [],
    ]);

    const identitiesById = new Map((identities || []).map((id: any) => [id.id, id]));
    const roomsById = new Map((rooms || []).map((r: any) => [r.id, r]));
    const pricesById = new Map((prices || []).map((p: any) => [p.id, p]));

    return contracts.map((contract) => {
      const customer = contract.customerId ? identitiesById.get(contract.customerId) : null;
      const room = contract.roomId ? roomsById.get(contract.roomId) : null;
      return {
        ...contract,
        customerName: customer?.fullName || customer?.email || customer?.phone || 'Khách hàng',
        customerPhone: customer?.phone || '',
        roomName: room?.roomNumber || 'Chưa xếp phòng',
        services: contract.services?.map((service: any) => {
          const price = pricesById.get(service.servicePriceId);
          return {
            ...service,
            serviceName: price?.service?.name || 'Chưa có tên dịch vụ',
            price: Number(price?.price ?? 0),
          };
        }) || [],
      };
    });
  }

  async getContracts(providerId: string, query: any) {
    const response = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND }, { providerId, ...query });
    if (response?.data) {
      response.data = await this.enrichContracts(providerId, response.data);
    }
    return response;
  }

  async getContractById(providerId: string, contractId: string) {
    const contract = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND_ONE }, { providerId, contractId });
    if (!contract) return contract;
    const enriched = await this.enrichContracts(providerId, [contract]);
    return enriched[0];
  }

  async getDraftByRequestNumber(providerId: string, contractNumber: string) {
    const contract = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.FIND_DRAFT_BY_REQUEST_NUMBER }, { providerId, contractNumber });
    if (!contract) return contract;
    const enriched = await this.enrichContracts(providerId, [contract]);
    return enriched[0];
  }
  async getViolations(providerId: string, actorId: string, query: ViolationQueryDto) {
    const violations = await this.proxy.send<any[]>(
      this.contractClient, 
      { cmd: ProviderContractPatterns.VIOLATIONS_FIND }, 
      { providerId, actorId, status: query.status }
    );
    
    if (!violations || !violations.length) return violations;

    const customerIds = [...new Set(violations.map(v => v.customerId).filter(Boolean))];
    const roomIds = [...new Set(violations.map(v => v.roomId).filter(Boolean))];

    const [identities, rooms] = await Promise.all([
      customerIds.length > 0 ? this.proxy.send<any[]>(this.identityClient, { cmd: 'provider.identities.batch' }, { identityIds: customerIds }).catch(() => []) : [],
      roomIds.length > 0 ? this.proxy.send<any[]>(this.catalogClient, { cmd: 'catalog.rooms.findByIdsForProvider' }, { providerId, roomIds }).catch(() => []) : [],
    ]);

    const identitiesById = new Map((identities || []).map(identity => [identity.id, identity]));
    const roomsById = new Map((rooms || []).map(room => [room.id, room]));

    return violations.map(v => {
      const identity = v.customerId ? identitiesById.get(v.customerId) : null;
      const room = v.roomId ? roomsById.get(v.roomId) : null;
      return {
        ...v,
        customerName: identity?.fullName || identity?.email || identity?.phone || 'Khách hàng',
        roomName: room?.roomNumber || room?.name || '',
        propertyName: room?.floor?.block?.property?.propertyName || room?.property?.propertyName || '',
      };
    });
  }

  async getCustomers(providerId: string) {
    const customers = await this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.CUSTOMERS_FIND }, { providerId });
    
    if (!customers || !customers.length) return customers;

    const contractIds = customers.map((c: any) => c.id).filter(Boolean);
    const outstandingTotals = contractIds.length > 0 ? await this.proxy.send(
      this.billingClient,
      { cmd: ProviderBillingPatterns.INVOICES_OUTSTANDING_TOTALS },
      { providerId, contractIds }
    ) : {};

    return customers.map((c: any) => ({
      ...c,
      currentDebt: outstandingTotals[c.id] || 0,
    }));
  }
}
