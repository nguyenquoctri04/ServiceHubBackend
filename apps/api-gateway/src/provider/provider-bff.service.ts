import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { GatewayProxyService } from '../proxy/gateway-proxy.service';
import { ProviderContractPatterns } from '@app/common/constants/provider.patterns';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { AggregatedRoomResponseDto } from './dto/aggregated-room.dto';

@Injectable()
export class ProviderBffService {
  constructor(
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    @Inject('BILLING_SERVICE') private readonly billingClient: ClientProxy,
    private readonly proxy: GatewayProxyService,
  ) {}

  async aggregateRoomData(providerId: string, rooms: any[]): Promise<AggregatedRoomResponseDto[]> {
    if (!rooms || rooms.length === 0) return [];

    const contracts = await this.proxy.send(
      this.contractClient,
      { cmd: ProviderContractPatterns.FIND_ACTIVE_BY_ROOM_IDS },
      { providerId, roomIds: rooms.map((room: any) => room.id) },
    );
    const contractIds = (contracts || []).map((contract: any) => contract.id);
    const [outstandingTotals, violations] = await Promise.all([
      contractIds.length === 0
        ? Promise.resolve({})
        : this.proxy.send(this.billingClient, { cmd: ProviderBillingPatterns.INVOICES_OUTSTANDING_TOTALS }, { providerId, contractIds }),
      contractIds.length === 0
        ? Promise.resolve([])
        : this.proxy.send(this.contractClient, { cmd: ProviderContractPatterns.VIOLATIONS_FIND }, { providerId, contractIds }),
    ]);

    return rooms.map((room: any) => {
      const activeContract = contracts?.find((c: any) => c.roomId === room.id && c.status === 'ACTIVE');

      let rentStatus = 'EMPTY';
      let debtAmount = 0;
      let issueCount = 0;

      if (activeContract) {
        rentStatus = 'RENTED';

        const contractViolations = violations?.filter((v: any) => v.contractId === activeContract.id && v.status === 'REPORTED');
        issueCount = contractViolations?.length || 0;

        debtAmount = Number(outstandingTotals?.[activeContract.id] || 0);
        const hasDebt = debtAmount > 0;

        if (issueCount > 0) {
          rentStatus = 'ISSUE';
        } else if (hasDebt) {
          rentStatus = 'DEBT';
        }
      }

      const dto = new AggregatedRoomResponseDto();
      dto.id = room.id;
      dto.roomNumber = room.roomNumber;
      dto.roomTypeId = room.roomTypeId;
      dto.status = room.status;
      dto.roomType = room.roomType ? {
        id: room.roomType.id,
        typeName: room.roomType.typeName
      } : undefined;
      dto.rentStatus = rentStatus;
      dto.tenant = activeContract ? {
        id: activeContract.customerId,
        name: activeContract.customerName,
        phone: activeContract.customerPhone
      } : undefined;
      dto.debtAmount = debtAmount;
      dto.contract = activeContract ? {
        id: activeContract.id,
        contractNumber: activeContract.contractNumber,
        endDate: activeContract.endDate
      } : undefined;
      dto.floorId = room.floorId;
      dto.floorName = room.floor?.floorName;
      dto.blockId = room.floor?.blockId;
      dto.blockName = room.floor?.block?.blockName;

      return dto;
    });
  }
}
