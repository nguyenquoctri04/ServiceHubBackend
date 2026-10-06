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
