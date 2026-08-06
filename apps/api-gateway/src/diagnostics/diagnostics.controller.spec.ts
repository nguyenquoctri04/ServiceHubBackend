import { Test, TestingModule } from '@nestjs/testing';
import { DiagnosticsController } from './diagnostics.controller';
import { of } from 'rxjs';

describe('DiagnosticsController', () => {
  let controller: DiagnosticsController;
  
  // Mock Provider Client
  const mockProviderClient = {
    send: jest.fn().mockImplementation((pattern, data) => {
      // Giả lập (Mock) kết quả trả về từ ProviderService mà không cần chạy Redis thật
      return of({
        service: 'ProviderService',
        status: 'Alive (Mocked)',
        receivedData: data,
        auditLogStatus: 'Success (Mocked)',
        timestamp: new Date().toISOString()
      });
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiagnosticsController],
      providers: [
        {
          provide: 'PROVIDER_SERVICE', // Phải khớp với tên Inject trong Controller
          useValue: mockProviderClient,
        },
      ],
    }).compile();

    controller = module.get<DiagnosticsController>(DiagnosticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should run E2E Test successfully', async () => {
    const mockUser = { id: 'uuid-123', email: 'test@example.com', role: 'PROVIDER' };
    
    // Gọi trực tiếp hàm trong Controller
    const result = await controller.runE2ETest(mockUser);
    
    // Kiểm tra kết quả
    expect(result.message).toEqual('Architecture E2E Test Completed Successfully');
    expect(result.user.email).toEqual('test@example.com');
    expect(result.downstreamResponse.service).toEqual('ProviderService');
    
    // Đảm bảo ClientProxy (Redis) đã thực sự được gọi
    expect(mockProviderClient.send).toHaveBeenCalledWith(
      { cmd: 'test.ping' },
      { userId: mockUser.id, email: mockUser.email }
    );
  });
});
