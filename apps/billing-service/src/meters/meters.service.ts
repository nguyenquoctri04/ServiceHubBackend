import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OcrService } from '../ocr/ocr.service';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';
import { Prisma, Meter } from '@prisma/client-billing';
import { SecureRpcService } from '@app/common';
import { ExcelRowDto, ServiceCreatedPayload } from './dto/meter.dto';

export interface MeterContext {
  meter: Meter;
  room: Record<string, unknown> | null;
  contract: Record<string, unknown> | null;
}

@Injectable()
export class MetersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ocrService: OcrService,
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
  ) {}

  async findMeters(payload: { providerId: string; page?: string; limit?: string }) {
    const { providerId } = payload;
    const page = payload.page ? Number(payload.page) : 1;
    const limit = payload.limit ? Number(payload.limit) : 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.meter.count({ where: { providerId } }),
      this.prisma.meter.findMany({ where: { providerId }, skip, take: limit })
    ]);
    return { data, total, page, limit };
  }

  async processOcr(imgUrl: string) {
    const value = await this.ocrService.processImage(imgUrl);
    return { value };
  }

  private async fetchValidationContext(providerId: string, data: { roomId?: string; contractId?: string; meterId: string }) {
    // 1 RPC call to either Catalog or Contract based on which ID is provided
    let room = null;
    let contract = null;

    if (data.roomId) {
      try {
        const roomsMap = await this.secureRpc.send<any>(
          this.catalogClient,
          { cmd: ProviderBillingPatterns.CATALOG_ROOMS_BY_IDS },
          [data.roomId]
        );
        room = roomsMap[data.roomId];
        if (!room) throw new RpcException(new NotFoundException('Room not found'));
        if (room.floor?.block?.property?.providerId !== providerId) throw new RpcException(new NotFoundException('Room not found'));
      } catch (err) {
        throw new RpcException('Catalog Service failed');
      }
    } else if (data.contractId) {
      try {
        const contractsMap = await this.secureRpc.send<any>(
          this.contractClient,
          { cmd: ProviderBillingPatterns.CONTRACTS_BY_IDS },
          [data.contractId]
        );
        contract = contractsMap[data.contractId];
        if (!contract) throw new RpcException(new NotFoundException('Contract not found'));
        if (contract.providerId !== providerId) throw new RpcException(new NotFoundException('Contract not found'));
      } catch (err) {
        throw new RpcException('Contract Service failed');
      }
    }

    const meter = await this.prisma.meter.findFirst({ where: { id: data.meterId, providerId, status: 'ACTIVE' } });
    if (!meter) throw new RpcException(new NotFoundException('Meter not found'));

    return { room, contract, meter };
  }

  async createMeterReadingCore(providerId: string, data: ExcelRowDto | any, recordedBy: string, source: 'MANUAL' | 'IMAGE' | 'EXCEL_IMPORT', context: MeterContext) {
    const { meter, room, contract } = context;
    if (!meter) throw new RpcException(new NotFoundException('Meter missing in context'));

    const reading = await this.prisma.meterReading.create({
      data: {
        meterId: meter.id,
        roomId: data.roomId ?? null,
        contractId: data.contractId ?? null,
        value: data.value,
        source,
        imgUrl: data.imgUrl,
        recordedBy,
        status: 'VALID',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    // TODO: Emit Event MeterReadingConfirmed here if needed.
    // this.eventEmitter.emit(ProviderBillingPatterns.EVENT_METER_READING_CONFIRMED, reading);

    return reading;
  }

  async createMeterReading(providerId: string, data: ExcelRowDto | any, recordedBy: string, source: 'MANUAL' | 'IMAGE' | 'EXCEL_IMPORT') {
    const context = await this.fetchValidationContext(providerId, data);
    return this.createMeterReadingCore(providerId, data, recordedBy, source, context);
  }

  async previewImport(providerId: string, rows: ExcelRowDto[]) {
    const roomIds = [...new Set(rows.map(r => r.roomId).filter(Boolean))];
    const contractIds = [...new Set(rows.map(r => r.contractId).filter(Boolean))];

    const [roomsMap, contractsMap] = await Promise.all([
      this.secureRpc.send<any>(this.catalogClient, { cmd: ProviderBillingPatterns.CATALOG_ROOMS_BY_IDS }, roomIds),
      this.secureRpc.send<any>(this.contractClient, { cmd: ProviderBillingPatterns.CONTRACTS_BY_IDS }, contractIds)
    ]);

    const results = rows.map(row => {
      let isValid = true;
      let errors = [];

      if (!row.meterId) { isValid = false; errors.push('Missing meterId'); }
      if (!row.roomId && !row.contractId) { isValid = false; errors.push('Missing roomId or contractId'); }
      if (row.roomId && (!roomsMap[row.roomId] || roomsMap[row.roomId].floor?.block?.property?.providerId !== providerId)) { isValid = false; errors.push('Invalid roomId'); }
      if (row.contractId && (!contractsMap[row.contractId] || contractsMap[row.contractId].providerId !== providerId)) { isValid = false; errors.push('Invalid contractId'); }
      
      return { row, isValid, errors };
    });

    return { preview: results };
  }

  async confirmImport(providerId: string, rows: ExcelRowDto[], recordedBy: string) {
    const roomIds = [...new Set(rows.map(r => r.roomId).filter(Boolean))];
    const contractIds = [...new Set(rows.map(r => r.contractId).filter(Boolean))];

    // 1. Batch fetch external data
    const [roomsMap, contractsMap] = await Promise.all([
      this.secureRpc.send<any>(this.catalogClient, { cmd: ProviderBillingPatterns.CATALOG_ROOMS_BY_IDS }, roomIds),
      this.secureRpc.send<any>(this.contractClient, { cmd: ProviderBillingPatterns.CONTRACTS_BY_IDS }, contractIds)
    ]);

    // 2. Fetch all meters internally
    const meterIds = [...new Set(rows.map(r => r.meterId).filter(Boolean))];
    const meters = await this.prisma.meter.findMany({ where: { id: { in: meterIds } } });
    const metersMap = Object.fromEntries(meters.map(m => [m.id, m]));

    // 3. Process each row with pre-fetched context (Partial Success)
    const promises = rows.map(async row => {
      if (!metersMap[row.meterId]) throw new Error(`Meter ${row.meterId} not found`);
      if (row.roomId && (!roomsMap[row.roomId] || roomsMap[row.roomId].floor?.block?.property?.providerId !== providerId)) throw new Error(`Room ${row.roomId} not found`);
      if (row.contractId && (!contractsMap[row.contractId] || contractsMap[row.contractId].providerId !== providerId)) throw new Error(`Contract ${row.contractId} not found`);

      const context = {
        meter: metersMap[row.meterId],
        room: row.roomId ? roomsMap[row.roomId] : null,
        contract: row.contractId ? contractsMap[row.contractId] : null
      };

      return this.createMeterReadingCore(providerId, row, recordedBy, 'EXCEL_IMPORT', context);
    });

    const results = await Promise.allSettled(promises);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failed = results
      .map((r, index) => r.status === 'rejected' ? { row: rows[index], reason: r.reason.message } : null)
      .filter(Boolean);

    return { success: successCount, failed };
  }

  async handleServiceCreated(payload: ServiceCreatedPayload) {
    // If service calculation_method is METERED, create a Meter for it
    if (payload.calculation_method === 'METERED') {
      await this.prisma.meter.create({
        data: {
          providerId: payload.providerId || '00000000-0000-0000-0000-000000000000', // Provide fallback or make sure payload has providerId
          name: `${payload.name} Meter`,
          serviceId: payload.id, // we might need serviceId in Meter if it's there. 
          unit: 'N/A', // Default unit, as the payload might not have it
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
    }
  }

  async getMeterDashboardStats(providerId: string) {
    const totalMeters = await this.prisma.meter.count({
      where: { providerId }
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const recordedMeters = await this.prisma.meter.count({
      where: {
        providerId,
        readings: {
          some: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth
            },
            status: 'VALID'
          }
        }
      }
    });

    return { totalMeters, recordedMeters };
  }
}
