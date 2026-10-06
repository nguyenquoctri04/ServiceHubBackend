import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { GatewayProxyService } from '../../proxy/gateway-proxy.service';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { CatalogPatterns } from '@app/common/constants/catalog.patterns';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { GroupedMeterQueryDto } from '../dto/meter.dto';

@Injectable()
export class ProviderBillingBffService {
  constructor(
    @Inject('BILLING_SERVICE') private readonly billingClient: ClientProxy,
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
  ) {}

  async getInvoices(providerId: string, query: InvoiceQueryDto) {
    const invoicesResp = await this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_FIND }, { providerId, query });
    
    if (!invoicesResp || !invoicesResp.data) return invoicesResp;

    const contractIds = [...new Set(invoicesResp.data.map((invoice: any) => invoice.contractId).filter(Boolean))];
    const contractsById = await this.proxy.send(
      this.contractClient,
      { cmd: ProviderContractPatterns.FIND_BY_IDS },
      { providerId, contractIds },
    );

    const servicePriceIds = [...new Set(invoicesResp.data.flatMap((inv: any) => inv.items?.map((item: any) => item.servicePriceId)).filter(Boolean))];
    const servicePrices = servicePriceIds.length > 0 ? await this.proxy.send(
      this.catalogClient,
      { cmd: 'services.prices.findForProvider' },
      { providerId, priceIds: servicePriceIds }
    ) : [];
    
    const serviceNameByPriceId = new Map<string, string>();
    if (Array.isArray(servicePrices)) {
      servicePrices.forEach((sp: any) => {
        if (sp.id && sp.service?.name) {
          serviceNameByPriceId.set(sp.id, sp.service.name);
        }
      });
    }

    const mappedData = invoicesResp.data.map((inv: any) => {
      const contract = contractsById?.[inv.contractId];
      return {
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        customer_id: contract?.customerId || '',
        customer_name: contract?.customerName || 'Khách hàng',
        contract_id: inv.contractId,
        contract_number: contract?.contractNumber || '',
        room_name: contract?.roomName || 'Chưa xếp phòng',
        total: inv.total,
        status: inv.status,
        created_at: inv.createdAt,
        updated_at: inv.updatedAt,
        items: inv.items?.map((item: any) => ({
          id: item.id,
          service_name: item.servicePriceId ? (serviceNameByPriceId.get(item.servicePriceId) || 'Dịch vụ') : 'Dịch vụ',
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          amount: item.amount,
        })),
        payments: inv.payments?.map((p: any) => ({
          id: p.id,
          invoice_id: p.invoiceId,
          payment_method: p.paymentMethod,
          status: p.status,
          paid_at: p.paidAt,
          created_at: p.createdAt,
        }))
      };
    });

    return { ...invoicesResp, data: mappedData };
  }

  async getGroupedMeters(providerId: string, query: GroupedMeterQueryDto) {
    const { propertyId, month, year } = query;

    const rooms = await this.proxy.send(
      this.catalogClient,
      { cmd: CatalogPatterns.ROOMS_FIND_BY_PROPERTY },
      { providerId, propertyId },
    );
    const roomIds = (rooms || []).map((room: any) => room.id);
    const [contracts, metersByRoom] = await Promise.all([
      this.proxy.send(
        this.contractClient,
        { cmd: ProviderContractPatterns.FIND_ACTIVE_BY_ROOM_IDS },
        { providerId, roomIds },
      ),
      this.proxy.send(
        this.billingClient,
        { cmd: ProviderBillingPatterns.METERS_GROUPED },
        { providerId, roomIds, month, year },
      ),
    ]);
    const servicePriceIds = [...new Set((contracts || []).flatMap((c: any) => (c.services || []).map((s: any) => s.servicePriceId)))];
    
    const servicePrices = servicePriceIds.length > 0 ? await this.proxy.send(
      this.catalogClient,
      { cmd: 'services.prices.findForProvider' },
      { providerId, priceIds: servicePriceIds }
    ) : [];
    
    const serviceIdByPriceId = new Map<string, string>(
      servicePrices.map((sp: any) => [sp.id, sp.service?.id]).filter(([_, id]) => id)
    );

    const contractsByRoom = new Map<string, any>(
      (contracts || [])
        .filter((contract: any) => Boolean(contract.roomId))
        .map((contract: any) => {
          const serviceIds = new Set((contract.services || []).map((s: any) => serviceIdByPriceId.get(s.servicePriceId)));
          return [contract.roomId, { id: contract.id, serviceIds }];
        }),
    );

    const occupied: any[] = [];
    const vacant: any[] = [];

    (rooms || []).forEach((room: any) => {
      const activeContract = contractsByRoom.get(room.id);
      let roomMeters = metersByRoom?.[room.id] || [];
      
      if (activeContract) {
        roomMeters = roomMeters.filter((m: any) => activeContract.serviceIds.has(m.meter.serviceId));
      }

      const card = {
        roomId: room.id,
        roomName: room.roomNumber,
        contractId: activeContract?.id || null,
        meters: roomMeters,
      };

      if (activeContract) {
        occupied.push(card);
      } else {
        vacant.push(card);
      }
    });

    return { occupied, vacant };
  }
}
