// @ts-nocheck
import { Test } from '@nestjs/testing';
import { CustomerContractsService } from './customer.contracts.service';
import { PrismaService } from '../prisma/prisma.service';
import { SecureRpcService } from '@app/common';

describe('CustomerContractsService', () => {
  let service: CustomerContractsService;
  let secureRpc: { send: jest.Mock };
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      contract: { create: jest.fn().mockResolvedValue({ id: 'contract-1', contractNumber: 'YCDV-TEST', services: [] }) },
    };
    secureRpc = { send: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        CustomerContractsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SecureRpcService, useValue: secureRpc },
        { provide: 'IDENTITY_SERVICE', useValue: {} },
        { provide: 'CATALOG_SERVICE', useValue: {} },
        { provide: 'NOTIFICATION_SERVICE', useValue: {} },
      ],
    }).compile();
    service = module.get(CustomerContractsService);
  });

  it('rejects a request when any price is outside the requested provider', async () => {
    secureRpc.send
      .mockResolvedValueOnce({ id: 'provider-1', identityId: 'identity-1' })
      .mockResolvedValueOnce([{ id: 'price-1' }]);

    await expect(service.createServiceRequest('customer-1', {
      providerId: 'provider-1', servicePriceIds: ['price-1', 'price-2'],
    })).rejects.toMatchObject({ error: { message: 'Dịch vụ đã chọn không thuộc nhà cung cấp.' } });
    expect(prisma.contract.create).not.toHaveBeenCalled();
  });

  it('creates a draft using a server-generated YCDV code then notifies the provider', async () => {
    secureRpc.send
      .mockResolvedValueOnce({ id: 'provider-1', identityId: 'identity-1' })
      .mockResolvedValueOnce([{ id: 'price-1' }])
      .mockResolvedValueOnce({ id: 'notification-1' });

    await service.createServiceRequest('customer-1', {
      providerId: 'provider-1', servicePriceIds: ['price-1'], requireSignature: true,
    });

    expect(prisma.contract.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customerId: 'customer-1', providerId: 'provider-1', status: 'DRAFT', requireSignature: true }),
    }));
    expect(secureRpc.send).toHaveBeenLastCalledWith(expect.anything(), { cmd: 'notifications.createInApp' }, expect.objectContaining({
      userId: 'identity-1', content: expect.stringContaining('Mã yêu cầu: YCDV-'),
    }));
  });
});
