import { NotificationPatterns } from '@app/common';
import { ProviderContractsService } from './provider.contracts.service';
import { RpcException } from '@nestjs/microservices';

describe('ProviderContractsService', () => {
  const createService = (prisma: any, secureRpc: any = { send: jest.fn() }, outboxService: any = { publishLocal: jest.fn() }) =>
    new ProviderContractsService(
      prisma as any,
      {} as any, // identityClient
      {} as any, // catalogClient
      {} as any, // notificationClient
      {} as any, // signatureClient
      secureRpc as any, // secureRpc
      {} as any, // configService
      { renderContractPdf: jest.fn() } as any, // pdfRenderer
      { emitStatusChanged: jest.fn() } as any, // contractRealtime
      outboxService as any, // outboxService
      {} as any, // inboxService
    );

  describe('findContracts', () => {
    it('returns a page of contracts without cross-service enrichment (now handled by BFF)', async () => {
      const prisma = {
        contract: {
          findMany: jest.fn().mockResolvedValue([{
            id: 'contract-1', providerId: 'provider-1', customerId: 'customer-1', roomId: 'room-1',
            services: [{ id: 'contract-service-1', servicePriceId: 'price-1', quantity: 1 }],
            terms: [{ term: { id: 'term-1', content: 'Điều khoản kiểm thử', status: 'ACTIVE' } }],
          }]),
        },
      };
      const secureRpc = {
        send: jest.fn().mockResolvedValue(null),
      };
      const service = createService(prisma, secureRpc);

      await expect(service.findContracts({ providerId: 'provider-1', page: 1, limit: 10 })).resolves.toEqual([
        expect.objectContaining({
          id: 'contract-1',
          providerId: 'provider-1',
        }),
      ]);

      expect(prisma.contract.findMany).toHaveBeenCalledWith(expect.objectContaining({
        include: expect.objectContaining({ services: true }),
      }));
    });
  });

  describe('hasRoomReferences', () => {
    it('reports room references only inside the active provider workspace', async () => {
      const prisma = { contract: { count: jest.fn().mockResolvedValue(1) } };
      const service = createService(prisma);

      await expect(service.hasRoomReferences('provider-1', 'room-1')).resolves.toEqual({ hasReferences: true });
      expect(prisma.contract.count).toHaveBeenCalledWith({
        where: { providerId: 'provider-1', roomId: 'room-1', status: { in: ['DRAFT', 'PENDING_SIGNATURE', 'PENDING_PAYMENT', 'ACTIVE'] } },
      });
    });
  });

  describe('cancelContract', () => {
    it('requires a reason and notifies the customer when a provider declines a contract', async () => {
      const prisma = {
        contract: {
          findFirst: jest.fn().mockResolvedValue({ id: 'contract-1', providerId: 'provider-1', customerId: 'customer-1', contractNumber: 'YCDV-001', status: 'DRAFT', revision: 1 }),
          update: jest.fn().mockResolvedValue({ id: 'contract-1', customerId: 'customer-1', contractNumber: 'YCDV-001', status: 'CANCELLED', revision: 2 }),
        },
        $transaction: jest.fn().mockImplementation((cb) => cb({
          contract: {
            update: jest.fn().mockResolvedValue({ id: 'contract-1', customerId: 'customer-1', contractNumber: 'YCDV-001', status: 'CANCELLED', revision: 2 }),
          },
        })),
      };
      const secureRpc = { send: jest.fn().mockResolvedValue(undefined) };
      const service = createService(prisma, secureRpc);

      await expect(service.cancelContract('provider-1', 'contract-1', '')).rejects.toMatchObject({ message: expect.stringContaining('lý do') });

      await expect(service.cancelContract('provider-1', 'contract-1', 'Không còn năng lực cung cấp dịch vụ.')).resolves.toMatchObject({ id: 'contract-1', status: 'CANCELLED' });
      expect(secureRpc.send).toHaveBeenCalledWith(expect.anything(), { cmd: NotificationPatterns.CREATE_IN_APP }, expect.objectContaining({
        userId: 'customer-1',
        providerId: 'provider-1',
        content: expect.stringContaining('Không còn năng lực cung cấp dịch vụ.'),
      }));
    });
  });

  describe('updateContract room conflict check', () => {
    it('blocks updating when room is already assigned to another active or pending contract', async () => {
      const prisma = {
        contract: {
          findFirst: jest.fn()
            // 1st call: find existing contract
            .mockResolvedValueOnce({ id: 'contract-1', providerId: 'provider-1', status: 'DRAFT', services: [], terms: [], files: [] })
            // 2nd call: check conflicting contract
            .mockResolvedValueOnce({ id: 'contract-2', contractNumber: 'HD-2026-0002', status: 'ACTIVE' }),
        },
      };
      const secureRpc = {
        send: jest.fn().mockResolvedValue([{ id: 'room-1' }]), // catalog room check passes
      };
      const service = createService(prisma, secureRpc);

      await expect(
        service.updateContract('provider-1', 'contract-1', { roomId: 'room-1' }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('createContract room conflict check', () => {
    it('blocks creation when room is already assigned to an active or pending contract', async () => {
      const prisma = {
        contract: {
          findFirst: jest.fn().mockResolvedValue({ id: 'contract-existing', contractNumber: 'HD-2026-0005', status: 'ACTIVE' }),
        },
      };
      const secureRpc = {
        send: jest.fn()
          .mockResolvedValueOnce({ id: 'customer-1' }) // checkCustomer
          .mockResolvedValueOnce([{ id: 'room-1' }]), // catalog room check
      };
      const service = createService(prisma, secureRpc);

      await expect(
        service.createContract('provider-1', { customerId: 'customer-1', roomId: 'room-1', services: [] }),
      ).rejects.toThrow(RpcException);
    });
  });
});
