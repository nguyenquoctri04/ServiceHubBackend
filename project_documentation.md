# Tài Liệu Dự Án: ServiceHub Backend

Chào mừng đến với dự án **ServiceHub Backend**! Tài liệu này là kim chỉ nam dành cho tất cả thành viên trong đội ngũ phát triển, giúp bạn nhanh chóng nắm bắt kiến trúc, quy ước viết code và cách vận hành dự án từ con số 0.

---

## 1. Kiến trúc Hệ thống (System Architecture)

Dự án này là một **Hệ thống Microservices** được xây dựng trên nền tảng **NestJS** (theo mô hình Monorepo), giao tiếp nội bộ qua **Redis** và lưu trữ dữ liệu hoàn toàn độc lập (Database-per-service) trên **PostgreSQL (Neon)** thông qua **Prisma ORM**.

Các thành phần cốt lõi:
1. **API Gateway (`apps/api-gateway`)**: Chốt chặn duy nhất giao tiếp với Client (Frontend/Mobile). Nó chịu trách nhiệm nhận HTTP Request, xác thực bảo mật (Stateless JWT Auth), kiểm tra quyền (RBAC), sau đó chuyển tiếp yêu cầu xuống các Microservice qua mạng Redis.
2. **Microservices (`apps/*-service`)**: Các dịch vụ nhỏ gọn, độc lập. Ví dụ: `Identity Service` lo tài khoản, `Provider Service` lo nhà cung cấp, `Audit Service` lo ghi log...
3. **Redis Message Broker**: Xương sống của hệ thống. Thay vì gọi API trực tiếp giữa các service (dễ chết dây chuyền), Gateway và các Service "nhắn tin" cho nhau thông qua Redis Pub/Sub.
4. **Database-per-service**: Mỗi Microservice có 1 Prisma Schema riêng và 1 Database riêng. Tuyệt đối không có chuyện Service A chọc thẳng vào Database của Service B.

---

## 2. Cấu trúc Thư mục & Quy ước Đặt tên

### Cấu trúc Tổng quan
```text
ServiceHubBackend/
├── apps/                 # Chứa API Gateway và toàn bộ Microservices
│   ├── api-gateway/      # Cổng giao tiếp với Client
│   ├── identity-service/ # Quản lý user, mã hóa password
│   ├── audit-service/    # Ghi nhận lịch sử hệ thống
│   ├── order-service/    # Quản lý đơn dịch vụ ngoài (EXTERNAL_SERVICE)
│   └── ... (các service khác)
├── libs/
│   └── common/           # Chứa code dùng chung (Guards, Decorators, Filters...)
├── package.json          # Quản lý thư viện chung
└── .env                  # Chứa toàn bộ mật khẩu, URL kết nối (Tuyệt đối không commit)
```

### Cấu trúc bên trong 1 Service (Feature-based Module)
Chúng ta theo sát chuẩn **Feature-based** của NestJS. Nghĩa là gom nhóm theo "Chức năng" chứ không gom theo "Loại file".
Ví dụ bên trong `apps/api-gateway`:
```text
apps/api-gateway/
 ├── src/                       # Thư mục gốc chứa Source Code và Unit Test
 │    ├── auth/                 # Thư mục tính năng Xác thực (Feature Module)
 │    │    ├── dto/             # Thư mục chứa Data Transfer Object (Kiểm tra dữ liệu đầu vào)
 │    │    │    ├── login.dto.ts      # Định nghĩa luật kiểm tra (email, password) khi login
 │    │    │    └── register.dto.ts   # Định nghĩa luật kiểm tra khi đăng ký
 │    │    ├── auth.controller.ts     # Nhận HTTP Request từ Client, gọi Service, trả Response
 │    │    ├── auth.service.ts        # Logic nghiệp vụ (Giao tiếp với Identity Service qua Redis)
 │    │    ├── auth.module.ts         # Gói toàn bộ Controller, Service của Auth lại thành 1 cụm
 │    │    └── jwt.strategy.ts        # Cấu hình tự động giải mã và xác minh chữ ký JWT Token
 │    │
 │    ├── diagnostics/          # Thư mục tính năng Chẩn đoán hệ thống
 │    │    ├── diagnostics.controller.ts      # Nhận Request test hệ thống
 │    │    ├── diagnostics.module.ts          # Gói tính năng Diagnostics
 │    │    └── diagnostics.controller.spec.ts # [Unit Test] Chạy test cục bộ cho riêng Controller này
 │    │
 │    ├── app.module.ts         # File gốc của Gateway, nơi Import tất cả các Module con vào
 │    └── main.ts               # File khởi động Server, cấu hình CORS, Cookie, Global Pipes
 │
 └── test/                      # Thư mục riêng biệt dành cho End-to-End Test (E2E)
      ├── diagnostics.e2e-spec.ts       # [E2E Test] Kịch bản test bắn Request giả lập như User thật
      └── jest-e2e.json                 # File cấu hình môi trường test cho thư viện Jest
```

### Quy ước Đặt tên (Naming Conventions)
- **Thư mục**: Kebab-case, viết thường, có dấu gạch ngang (VD: `audit-logs`).
- **File**: Kebab-case, kết thúc bằng loại file (VD: `user.controller.ts`, `jwt-auth.guard.ts`, `create-user.dto.ts`).
- **Class**: PascalCase (VD: `UserController`, `CreateUserDto`).
- **File Test**: Cùng tên file code, thêm chữ `.spec.ts` (Unit Test) hoặc `.e2e-spec.ts` (Nằm trong thư mục `test/`).

---

## 3. Luồng Code ra 1 API hoàn chỉnh (End-to-End API Flow)

Để dễ hình dung nhất, hãy lấy **Chức năng Login** làm ví dụ chuẩn mực cho luồng chạy xuyên suốt từ Client xuống Database:

**Bước 1: Gateway tiếp nhận và Validate (API Gateway)**
- Client gửi `POST /api/auth/login` kèm theo email và password.
- Tại `auth.controller.ts`, hàm `login()` nhận Request. Trước khi vào hàm, NestJS tự động dùng `LoginDto` (`login.dto.ts`) để kiểm tra xem email có đúng định dạng không, password có bị rỗng không (thông qua thư viện `class-validator`).
- Nếu hợp lệ, Controller chuyển dữ liệu cho `auth.service.ts`.

**Bước 2: Gateway nhắn tin qua Redis**
- Tại `auth.service.ts` (của Gateway), nó dùng `ClientProxy` để bắn một tin nhắn mang theo thông tin đăng nhập xuống mạng Redis với nhãn (pattern) là `{ cmd: 'auth.login' }`.
- Gateway lúc này sẽ đứng đợi (await) kết quả trả về từ Redis.

**Bước 3: Microservice xử lý nghiệp vụ (Identity Service)**
- Ở phía đầu kia của mạng Redis, `Identity Service` đang chạy ngầm.
- Trong `auth.controller.ts` của Identity, một hàm được gắn mác `@MessagePattern({ cmd: 'auth.login' })` sẽ chộp lấy tin nhắn này.
- Controller lập tức ném dữ liệu qua cho `auth.service.ts` (của Identity).
- Tại đây, Service gọi `Prisma` để tìm User trong Database (PostgreSQL của riêng Identity), sau đó so sánh mã băm mật khẩu (Bcrypt).
- Nếu mật khẩu chính xác, Identity Service `return` cục thông tin User.

**Bước 4: Trả kết quả và cấp Token (Trở lại Gateway)**
- Cục thông tin User tự động lội ngược dòng qua Redis về lại cho Gateway.
- Gateway tiến hành ký **Access Token** (15 phút) và **Refresh Token** (7 ngày) dựa trên thông tin User đó.
- Cuối cùng, Gateway trả Access Token ra màn hình (JSON body), và nhét ngầm Refresh Token vào **HttpOnly Cookie** rồi phản hồi về cho Client. Đóng lại một vòng đời API hoàn hảo!

### Hướng dẫn Code: Khi một Service phụ thuộc dữ liệu của Service khác
Vì kiến trúc "Mỗi Service 1 Database riêng", tuyệt đối **KHÔNG** dùng lệnh `JOIN` SQL chéo DB. Khi Service A (VD: `Contract Service`) cần lấy dữ liệu từ Service B (VD: `Provider Service`) để xử lý logic nội bộ:

**1. Cấu hình kết nối ở Module (Service A)**
Tại file `*.module.ts` của bạn, khai báo `ClientsModule` trỏ về Service B:
```typescript
ClientsModule.registerAsync([
  {
    name: 'PROVIDER_SERVICE', // Tên hằng số dùng để Inject
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.REDIS,
      options: parseRedisUrl(configService.get<string>('REDIS_URL')),
    }),
    inject: [ConfigService],
  }
])
```

**2. Viết Code gọi dữ liệu đồng bộ ở Service A (Kèm Cơ Chế Retry & Fallback)**
Trong file `*.service.ts` của bạn, Inject `ClientProxy` đó vào và dùng `firstValueFrom` để gọi sang Service B. 
**Bắt buộc:** Phải kèm theo cơ chế phòng vệ `timeout` (ngắt sau vài giây) và `retry` (thử lại) đề phòng Service B đang bị sập hoặc nghẽn mạng!
```typescript
import { timeout, retry, catchError } from 'rxjs/operators';
import { firstValueFrom, throwError } from 'rxjs';

constructor(
  @Inject('PROVIDER_SERVICE') private readonly providerClient: ClientProxy,
) {}

async createContract(data: any) {
  // 1. Gọi sang Provider Service lấy thông tin (Có phòng vệ chống sập)
  const provider = await firstValueFrom(
    this.providerClient.send({ cmd: 'get.provider.by.id' }, data.providerId).pipe(
      timeout(5000), // Đợi tối đa 5 giây
      retry(3),      // Nếu rớt mạng, tự động thử lại tối đa 3 lần
      catchError(err => throwError(() => new RequestTimeoutException('Provider Service không phản hồi')))
    )
  );

  // 2. Xử lý logic phụ thuộc
  if (!provider || provider.status !== 'ACTIVE') {
    throw new BadRequestException('Provider không đủ điều kiện ký hợp đồng');
  }

  // 3. Tiếp tục lưu xuống Database của riêng Contract Service
  return this.prisma.contract.create({ ... });
}
```

**3. Xử lý và Trả dữ liệu ở Service B**
Ở đầu nhận (Service B), trong file `*.controller.ts`, bạn dùng `@MessagePattern` để hứng lệnh. Dữ liệu mà hàm này `return` sẽ tự động lội ngược dòng Redis về cho Service A. Nếu có lỗi, phải ném ra `RpcException` (không dùng `HttpException` vì đây là giao thức nội bộ).
```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';

@Controller()
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @MessagePattern({ cmd: 'get.provider.by.id' })
  async getProviderById(@Payload() id: string) {
    const provider = await this.providersService.findById(id);
    
    if (!provider) {
      // Ném lỗi dành riêng cho Microservice
      throw new RpcException('Không tìm thấy Provider trong CSDL'); 
    }
    
    return provider; // Tự động chạy ngược về Service A
  }
}
```

> **QUY TẮC BẮT BUỘC:** 
> - Mọi giao tiếp chéo đều phải dùng `ClientProxy.send()`. Tuyệt đối không hardcode gọi API qua Axios.
> - BẮT BUỘC phải pipe thêm `timeout()` và `catchError()` ở đầu gọi (Service A) để tránh tình trạng "Chết chùm" (Cascading Failure) nếu Service B bị sập.

---

## 4. Hướng dẫn Khởi chạy Hệ thống (Setup & Run Guide)

Dành cho thành viên mới clone project về, hãy chạy tuần tự các lệnh sau để khởi động toàn bộ kiến trúc khổng lồ này:

### Bước 1: Tải Code & Cài đặt
Mở Terminal tại thư mục gốc của dự án:
```bash
git clone <url-repo>
cd ServiceHubBackend
npm install
```

### Bước 2: Thiết lập Biến Môi trường
Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```
👉 Mở file `.env` lên và điền các thông tin quan trọng: `JWT_SECRET`, `REDIS_URL` (Redis Cloud) và 10 chuỗi kết nối Database `*_DATABASE_URL`.

### Bước 3: Build Prisma Clients
Vì chúng ta có 10 Database độc lập, Prisma cần phải sinh code cho cả 10 cái:
```bash
npm run prisma:generate
```

### Bước 4: Khởi động toàn bộ Hệ thống
Chạy lệnh ma thuật sau để khởi động cùng lúc API Gateway và 9 Microservices:
```bash
npm run start:all
```

**Thành công!** 🎉 
Hệ thống hiện đã hoạt động. API Gateway lắng nghe tại `http://localhost:3000`. Bạn có thể mở Postman và bắt đầu test các API như `POST /api/auth/register`!
