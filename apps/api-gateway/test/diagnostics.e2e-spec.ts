import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('DiagnosticsController (e2e)', () => {
  let app: INestApplication;
  let testAccessToken: string;

  beforeAll(async () => {
    // 1. Khởi tạo toàn bộ ứng dụng (AppModule) giống y hệt lúc chạy thật
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser()); // Nhớ gắn lại Middleware như trong main.ts
    await app.init();
    
    // Lưu ý: Trong E2E Test thực tế, NestJS sẽ kết nối thẳng vào Redis và Database thật 
    // (nên thường người ta dùng DB Test riêng biệt để không làm bẩn DB Prod).
  });

  afterAll(async () => {
    await app.close();
  });

  // Test Case 1: Lấy Token
  it('/api/auth/login (POST) - Nên trả về Access Token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@servicehub.com', password: 'password123' })
      .expect(201); // Created

    expect(response.body.accessToken).toBeDefined();
    
    // Lưu Token lại để dùng cho bài test sau
    testAccessToken = response.body.accessToken;
  });

  // Test Case 2: Kiểm thử Luồng Kiến trúc E2E
  it('/api/diagnostics/e2e-test (GET) - Nên chặn nếu không có Token', () => {
    return request(app.getHttpServer())
      .get('/api/diagnostics/e2e-test')
      .expect(401); // Unauthorized
  });

  it('/api/diagnostics/e2e-test (GET) - Nên chạy thành công khi có Token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/diagnostics/e2e-test')
      .set('Authorization', `Bearer ${testAccessToken}`)
      .expect(200);

    expect(response.body.message).toEqual('Architecture E2E Test Completed Successfully');
    expect(response.body.downstreamResponse).toBeDefined();
    // Vì kết nối qua Redis tới ProviderService thật, ta có thể kỳ vọng nó trả về chữ 'Alive'
    expect(response.body.downstreamResponse.status).toEqual('Alive');
  });
});
