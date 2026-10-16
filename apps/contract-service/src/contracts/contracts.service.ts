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
    
    // Identity fetch removed
    let customersData = [];
    // Removed Identity RPC










    
    const rooms = [];






    const roomsById = new Map(rooms.map((room: any) => [room.id, room]));

    // Map identity and room data in batches
    let results = contracts.map(contract => {
      const identity = undefined;
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

  async getStatusDistribution(providerId: string) {
    const stats = await this.prisma.contract.groupBy({
      by: ['status'],
      where: { providerId },
      _count: { id: true }
    });

    let active = 0, pending = 0, churn = 0;
    stats.forEach(s => {
      if (s.status === 'ACTIVE') active += s._count.id;
      if (s.status === 'PENDING_SIGNATURE' || s.status === 'DRAFT') pending += s._count.id;
      if (s.status === 'EXPIRED' || s.status === 'TERMINATED' || s.status === 'CANCELLED') churn += s._count.id;
    });

    const total = active + pending + churn;
    if (total === 0) return { active: 0, pending: 0, churn: 0 };

    return {
      active: Math.round((active / total) * 100),
      pending: Math.round((pending / total) * 100),
      churn: Math.round((churn / total) * 100),
    };
  }

  async getExpiringContracts(providerId: string) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const expiring = await this.prisma.contract.findMany({
      where: {
        providerId,
        status: 'ACTIVE',
        endDate: { lte: nextMonth, not: null }
      },
      select: { contractNumber: true, endDate: true }
    });
    return expiring;
  }

  async getRecentContracts(providerId: string) {
    const contracts = await this.prisma.contract.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return contracts.map(c => ({
      id: c.id,
      type: 'CONTRACT',
      title: c.status === 'DRAFT' ? 'Yêu cầu dịch vụ mới' : (c.status === 'PENDING_SIGNATURE' ? 'Gửi hợp đồng chờ ký' : 'Hợp đồng mới'),
      description: `Hợp đồng ${c.contractNumber}`,
      timestamp: c.createdAt,
      color: c.status === 'DRAFT' ? 'blue' : (c.status === 'PENDING_SIGNATURE' ? 'orange' : 'green')
    }));
  }
}


