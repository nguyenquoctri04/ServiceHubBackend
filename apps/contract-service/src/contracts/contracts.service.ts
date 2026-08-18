import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy } from '@nestjs/microservices';
import { SecureRpcService } from '@app/common';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IDENTITY_SERVICE') private readonly identityClient: ClientProxy,
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
  ) {}

  async findCustomersByProvider(providerId: string, options?: { status?: string, page?: number, limit?: number, search?: string }) {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    
    // Gap #1: distinct with correct orderBy
    // Prisma requires orderBy to be the same as distinct, plus secondary sorts
    const contracts = await this.prisma.contract.findMany({
      where: { providerId },
      distinct: ['customerId'],
      orderBy: [
        { customerId: 'asc' }, 
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        contractNumber: true,
        customerId: true,
        roomId: true,
        status: true,
        startDate: true,
        endDate: true,
      }
    });

    const customerIds = contracts.map(c => c.customerId);
    const roomIds = contracts.flatMap((contract) => contract.roomId ? [contract.roomId] : []);
    
    // Call Identity Service batch to get customer details
    let customersData = [];
    try {
      if (customerIds.length > 0) {
        customersData = await this.secureRpc.send(
          this.identityClient,
          { cmd: 'provider.identities.batch' },
          { identityIds: customerIds }
        );
      }
    } catch (error) {
      console.error('Failed to fetch identity batch', error);
    }
    
    const rooms = roomIds.length === 0
      ? []
      : await this.secureRpc.send<any[]>(
        this.catalogClient,
        { cmd: 'catalog.rooms.findByIdsForProvider' },
        { providerId, roomIds },
      ).catch(() => []);
    const roomsById = new Map(rooms.map((room: any) => [room.id, room]));

    // Map identity and room data in batches, then apply search/filter.
    let results = contracts.map(contract => {
      const identity = customersData.find((i: any) => i.id === contract.customerId);
      const room = contract.roomId ? roomsById.get(contract.roomId) : undefined;
      return {
        id: contract.customerId,
        name: identity?.email || identity?.phone || 'Khách hàng',
        phone: identity?.phone || '',
        contractId: contract.id,
        room: room?.roomNumber || 'Chưa xếp phòng',
        status: contract.status,
        joinDate: contract.startDate
      };
    });

    if (options?.search) {
      const search = options.search.toLowerCase();
      results = results.filter(r => r.name.toLowerCase().includes(search) || r.phone.includes(search));
    }
    
    if (options?.status && options.status !== 'ALL') {
      results = results.filter(r => r.status === options.status);
    }

    // Manual Pagination
    const total = results.length;
    const paginated = results.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
