import { Injectable, Inject, BadRequestException, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { GatewayProxyService } from '../../proxy/gateway-proxy.service';
import { ProviderContractPatterns, ProviderIdentityPatterns } from '@app/common/constants/provider.patterns';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { CatalogPatterns } from '@app/common/constants/catalog.patterns';
import { NotificationPatterns } from '@app/common/constants/notification.patterns';
import { RedisService } from '@app/common/utils/redis.service';
import { InvoiceQueryDto } from '@app/common/dto/billing/invoice-query.dto';
import { GroupedMeterQueryDto } from '../dto/meter.dto';
import { RevenueLedgerQueryDto } from '../dto/revenue-ledger-query.dto';

@Injectable()
export class ProviderBillingBffService {
  private readonly logger = new Logger(ProviderBillingBffService.name);
  private readonly reminderCooldowns = new Map<string, number>();

  constructor(
    @Inject('BILLING_SERVICE') private readonly billingClient: ClientProxy,
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async getInvoices(providerId: string, query: InvoiceQueryDto) {
    const enrichedQuery: InvoiceQueryDto = { ...query };

    if (query.search?.trim()) {
      const searchLower = query.search.trim().toLowerCase();

      // Resolve matching contracts & customers across this provider
      const contracts = await this.proxy.send<any[]>(
        this.contractClient,
        { cmd: ProviderContractPatterns.CUSTOMERS_FIND },
        { providerId, query: { limit: 1000 } },
      ).catch(() => []);

      const matchedContractIds = new Set<string>();
      const matchedCustomerIds = new Set<string>();

      if (Array.isArray(contracts)) {
        for (const c of contracts) {
          const matchCustomer = c.customerName && c.customerName.toLowerCase().includes(searchLower);
          const matchPhone = c.customerPhone && c.customerPhone.toLowerCase().includes(searchLower);
          const matchContractNum = c.contractNumber && c.contractNumber.toLowerCase().includes(searchLower);
          const matchRoom = c.roomName && c.roomName.toLowerCase().includes(searchLower);

          if (matchCustomer || matchPhone || matchContractNum || matchRoom) {
            if (c.id) matchedContractIds.add(c.id);
            if (c.customerId) matchedCustomerIds.add(c.customerId);
          }
        }
      }

      if (matchedContractIds.size > 0) {
        enrichedQuery.contractIds = [...matchedContractIds];
      }
      if (matchedCustomerIds.size > 0) {
        enrichedQuery.customerIds = [...matchedCustomerIds];
      }
    }

    const invoicesResp = await this.proxy.send(
      this.billingClient,
      { cmd: ProviderBillingPatterns.INVOICES_FIND },
      { providerId, query: enrichedQuery },
    );
    
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
      { cmd: CatalogPatterns.SERVICES_PRICES_FIND_FOR_PROVIDER },
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

    const customerIds = [...new Set(Object.values(contractsById || {}).map((c: any) => c.customerId).filter(Boolean))];
    const roomIds = [...new Set(Object.values(contractsById || {}).map((c: any) => c.roomId).filter(Boolean))];
    
    const [identities, rooms] = await Promise.all([
      customerIds.length > 0 ? this.proxy.send<any[]>(this.identityClient, { cmd: ProviderIdentityPatterns.IDENTITIES_BATCH }, { identityIds: customerIds }).catch(() => []) : [],
      roomIds.length > 0 ? this.proxy.send<any[]>(this.catalogClient, { cmd: CatalogPatterns.ROOMS_FIND_BY_IDS_FOR_PROVIDER }, { providerId, roomIds }).catch(() => []) : [],
    ]);
    const identitiesById = new Map((identities || []).map((id: any) => [id.id, id]));
    const roomsById = new Map((rooms || []).map((r: any) => [r.id, r]));

    const mappedData = invoicesResp.data.map((inv: any) => {
      const contract = contractsById?.[inv.contractId];
      const identity = contract?.customerId ? identitiesById.get(contract.customerId) : null;
      const room = contract?.roomId ? roomsById.get(contract.roomId) : null;
      return {
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        customer_id: contract?.customerId || '',
        customer_name: identity?.fullName || identity?.email || identity?.phone || 'Khách hàng',
        contract_id: inv.contractId,
        contract_number: contract?.contractNumber || '',
        room_name: room?.roomNumber || 'Chưa xếp phòng',
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

  async getRevenueTransactions(providerId: string, query: RevenueLedgerQueryDto) {
    const response = await this.proxy.send(
      this.billingClient,
      { cmd: ProviderBillingPatterns.REVENUE_TRANSACTIONS },
      { providerId, query },
    );
    if (!response?.data?.length) return response;

    const customerIds = [...new Set(
      response.data.map((row: any) => row.invoice?.customerId).filter(Boolean),
    )];
    const identities = customerIds.length
      ? await this.proxy.send<any[]>(
          this.identityClient,
          { cmd: ProviderIdentityPatterns.IDENTITIES_BATCH },
          { identityIds: customerIds },
        ).catch(() => [])
      : [];
    const byId = new Map((identities || []).map((identity: any) => [identity.id, identity]));

    return {
      ...response,
      data: response.data.map((row: any) => {
        const identity = row.invoice?.customerId
          ? byId.get(row.invoice.customerId) as any
          : null;
        return {
          ...row,
          customerName: identity?.fullName || identity?.email || identity?.phone || null,
        };
      }),
    };
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
      { cmd: CatalogPatterns.SERVICES_PRICES_FIND_FOR_PROVIDER },
      { providerId, priceIds: servicePriceIds }
    ) : [];
    
    const serviceIdByPriceId = new Map<string, string>(
      servicePrices.map((sp: any) => [sp.id, sp.service?.id]).filter(([_, id]) => id)
    );

    const contractsByRoom = new Map<string, any>(
      (contracts || [])
        .filter((contract: any) => Boolean(contract.roomId))
        .map((contract: any) => {
          const serviceIds = new Set((contract.services || []).map((s: any) => serviceIdByPriceId.get(s.servicePriceId)).filter(Boolean));
          return [contract.roomId, { id: contract.id, contractNumber: contract.contractNumber, customerId: contract.customerId, serviceIds }];
        }),
    );

    const customerIds = [...new Set((contracts || []).map((c: any) => c.customerId).filter(Boolean))];
    const identities = customerIds.length > 0 ? await this.proxy.send<any[]>(this.identityClient, { cmd: ProviderIdentityPatterns.IDENTITIES_BATCH }, { identityIds: customerIds }).catch(() => []) : [];
    const identitiesById = new Map((identities || []).map((id: any) => [id.id, id]));

    const occupied: any[] = [];
    const vacant: any[] = [];

    (rooms || []).forEach((room: any) => {
      const activeContract = contractsByRoom.get(room.id);
      let roomMeters = metersByRoom?.[room.id] || [];
      
      if (activeContract && activeContract.serviceIds && activeContract.serviceIds.size > 0) {
        const filtered = roomMeters.filter((m: any) => activeContract.serviceIds.has(m.meter.serviceId));
        if (filtered.length > 0) {
          roomMeters = filtered;
        }
      }

      const identity = activeContract?.customerId ? identitiesById.get(activeContract.customerId) : null;
      const card = {
        roomId: room.id,
        roomName: room.roomNumber,
        contractId: activeContract?.id || null,
        contractNumber: activeContract?.contractNumber || null,
        tenantName: identity?.fullName || identity?.email || identity?.phone || null,
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

  async previewImport(providerId: string, rows: any[]) {
    return this.proxy.send(
      this.billingClient,
      { cmd: ProviderBillingPatterns.METERS_IMPORT_PREVIEW },
      { providerId, rows }
    );
  }

  async confirmImport(providerId: string, recordedBy: string, dto: any) {
    return this.proxy.send(
      this.billingClient,
      { cmd: ProviderBillingPatterns.METERS_IMPORT_CONFIRM },
      { providerId, recordedBy, dto }
    );
  }

  async remindInvoice(providerId: string, invoiceId: string, providerUserId: string) {
    const COOLDOWN_SECONDS = 24 * 60 * 60;
    const COOLDOWN_MS = COOLDOWN_SECONDS * 1000;
    const now = Date.now();
    const cacheKey = `reminder:invoice:${invoiceId}`;

    let isLockedViaRedis = false;

    // 1. Kiểm tra Cooldown & Chống Race Condition bằng Atomic Distributed Lock (Redis NX)
    if (this.redisService) {
      try {
        const client = this.redisService.getClient();
        const setResult = await client.set(cacheKey, String(now), 'EX', COOLDOWN_SECONDS, 'NX');
        if (!setResult) {
          const ttl = await client.ttl(cacheKey);
          const remainingHours = ttl > 0 ? Math.ceil(ttl / 3600) : 24;
          throw new BadRequestException(
            `Hóa đơn này đã được gửi nhắc nợ hôm nay. Vui lòng đợi thêm khoảng ${remainingHours} giờ trước khi gửi lại.`
          );
        }
        isLockedViaRedis = true;
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        this.logger.warn(`Lỗi kiểm tra Redis cooldown: ${err?.message}, chuyển sang kiểm tra in-memory`);
      }
    }

    if (!isLockedViaRedis) {
      const cooldownExpires = this.reminderCooldowns.get(invoiceId);
      if (cooldownExpires && cooldownExpires > now) {
        const remainingHours = Math.ceil((cooldownExpires - now) / (60 * 60 * 1000));
        throw new BadRequestException(
          `Hóa đơn này đã được gửi nhắc nợ hôm nay. Vui lòng đợi thêm khoảng ${remainingHours} giờ trước khi gửi lại.`
        );
      }
    }

    try {
      // 2. Xác thực hóa đơn & quyền sở hữu của Provider qua RPC
      const invoice = await this.proxy.send<any>(
        this.billingClient,
        { cmd: ProviderBillingPatterns.INVOICES_REMIND },
        { providerId, invoiceId },
      );

      // 3. Trích xuất Customer ID (từ hóa đơn hoặc hợp đồng thuộc Provider)
      let customerId = invoice.customerId;
      if (!customerId && invoice.contractId) {
        const contractsById = await this.proxy.send<any>(
          this.contractClient,
          { cmd: ProviderContractPatterns.FIND_BY_IDS },
          { providerId, contractIds: [invoice.contractId] },
        ).catch(() => ({}));
        customerId = contractsById?.[invoice.contractId]?.customerId;
      }

      if (!customerId) {
        throw new BadRequestException('Không tìm thấy thông tin khách hàng gắn với hóa đơn này để gửi nhắc nợ');
      }

      // 4. Phát lệnh gửi thông báo In-App tới đúng người dùng
      const totalFormatted = Number(invoice.total).toLocaleString('vi-VN');
      await this.proxy.send(
        this.notificationClient,
        { cmd: NotificationPatterns.CREATE_IN_APP },
        {
          userId: customerId,
          title: `Nhắc nhở thanh toán hóa đơn ${invoice.invoiceNumber}`,
          content: `Hóa đơn ${invoice.invoiceNumber} với số tiền ${totalFormatted} đ đang chờ thanh toán. Quý khách vui lòng kiểm tra và hoàn tất thanh toán.`,
          createdBy: providerUserId,
        },
      ).catch((err: any) => {
        this.logger.warn(`Không thể gửi notification cho khách hàng ${customerId}: ${err?.message || err}`);
      });

      this.reminderCooldowns.set(invoiceId, now + COOLDOWN_MS);

      return {
        success: true,
        message: `Đã gửi thông báo nhắc nợ hóa đơn ${invoice.invoiceNumber} thành công`,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
      };
    } catch (error) {
      // Giải phóng khóa nếu request bị lỗi nghiệp vụ
      if (isLockedViaRedis && this.redisService) {
        await this.redisService.del(cacheKey).catch(() => null);
      }
      this.reminderCooldowns.delete(invoiceId);
      throw error;
    }
  }
}
