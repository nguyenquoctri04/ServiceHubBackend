# SERVICEHUB BACKEND — CƠ CHẾ BẢO MẬT & TRUYỀN CONTEXT (GATEWAY & MICROSERVICES)

> **Tài liệu hoàn thành (Completed)**: Quy định và kiến trúc bảo mật tập trung cho toàn bộ hệ thống Microservices của ServiceHub.

---

## 1. Tổng Quan Kiến Trúc Bảo Mật

Hệ thống áp dụng mô hình **Bảo mật tập trung tại API Gateway (Centralized Authentication at Edge)**:

```text
 Client (React Web / App)
        │
        │ HTTP Request (Headers: Authorization: Bearer <JWT_TOKEN>)
        ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                              API GATEWAY                               │
 │                                                                        │
 │  1. JwtAuthGuard: Kiểm tra signature, expiration date của JWT Token    │
 │  2. RolesGuard: Kiểm tra phân quyền (ADMIN, PROVIDER, CUSTOMER)        │
 │  3. Trích xuất User Context: { id, email, role }                       │
 │  4. GatewayProxyService: Đóng gói Payload { ...data, currentUser }     │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     │ Redis Microservice RPC
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     MICROSERVICES (10 Services)                        │
 │                                                                        │
 │  5. Nhận payload chứa currentUser đã được Gateway xác thực            │
 │  6. Sử dụng decorator @CurrentUser() để lấy id, role xử lý nghiệp vụ    │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Các Thành Phần Bảo Mật Đã Triển Khai

### 2.1. Thư viện dùng chung (`libs/common`)

1. **Decorator `@CurrentUser()`** (`libs/common/src/decorators/current-user.decorator.ts`):
   - Hỗ trợ đa môi trường: **HTTP** (Gateway Controllers) và **RPC** (Microservice Handlers).
   - Tự động nhận biết ngữ cảnh thực thi (`ctx.getType()`):
     - Ngữ cảnh HTTP: Đọc `req.user`.
     - Ngữ cảnh RPC: Đọc `rpcData.currentUser` hoặc `rpcData.user`.
   - Hỗ trợ lấy toàn bộ thông tin `@CurrentUser()` hoặc lấy từng thuộc tính `@CurrentUser('id')`, `@CurrentUser('role')`.

2. **Guard `@Roles()` & `RolesGuard`** (`libs/common/src/guards/roles.guard.ts`):
   - Kiểm tra quyền truy cập của người dùng dựa trên danh sách role được phép (`@Roles('ADMIN', 'PROVIDER')`).
   - Hỗ trợ kiểm tra quyền ở cả tầng Gateway (HTTP) lẫn tầng Microservices (RPC).

### 2.2. API Gateway (`apps/api-gateway`)

1. **Xác thực JWT (`JwtStrategy` & `JwtAuthGuard`)**:
   - Giải mã token từ header `Authorization: Bearer <token>`.
   - Kiểm tra khóa `JWT_SECRET` trong biến môi trường `.env`.
   - Trả về thông tin User Payload (`id`, `email`, `role`) đính kèm vào `req.user`.

2. **Dịch vụ chuyển tiếp Proxy (`GatewayProxyService`)** (`apps/api-gateway/src/proxy/gateway-proxy.service.ts`):
   - Đóng gói dữ liệu request kèm thông tin `currentUser` trước khi gửi sang Microservices qua Redis:
     ```typescript
     const payload = { ...data, currentUser: req.user };
     ```
   - Tự động bắt lỗi RPC và chuyển đổi thành HTTP Status Code phù hợp (`400`, `401`, `403`, `404`, `500`).

---

## 3. Hướng Dẫn Sử Dụng Cho Developer

> **Quy ước cấu trúc thư mục (Feature-based Module)**: Mỗi tính năng là 1 thư mục con bên trong `src/`, chứa đầy đủ `controller`, `service`, `module`, và `dto/`. Đây là chuẩn thực tế của dự án (xem `auth/`, `identities/`, `providers/`, `properties/`...).

### 3.1. Viết Endpoint Được Bảo Vệ Tại API Gateway

Ví dụ: Thêm tính năng quản lý Properties tại Gateway → tạo thư mục `apps/api-gateway/src/properties/`

```typescript
// apps/api-gateway/src/properties/properties.controller.ts
import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@app/common';
import { GatewayProxyService } from '../proxy/gateway-proxy.service';

@Controller('provider/properties')
@UseGuards(JwtAuthGuard, RolesGuard) // Yêu cầu đăng nhập & kiểm tra role
@Roles('PROVIDER')                   // Chỉ cho phép Nhà cung cấp
export class PropertiesController {
  constructor(
    @Inject('PROPERTY_SERVICE') private readonly propertyClient: ClientProxy,
    private readonly proxyService: GatewayProxyService,
  ) {}

  @Get()
  async getMyProperties(@CurrentUser() user: any) {
    // Tự động chuyển request + currentUser tới Property Service qua Redis
    return this.proxyService.send(
      this.propertyClient,
      { cmd: 'property.getByProvider' },
      {},
      user,
    );
  }
}
```

### 3.2. Viết Handler Xử Lý Trong Microservice

Ví dụ: Microservice `property-service` → file nằm trong `apps/property-service/src/properties/`

```typescript
// apps/property-service/src/properties/properties.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CurrentUser } from '@app/common';
import { PropertiesService } from './properties.service';

@Controller()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @MessagePattern({ cmd: 'property.getByProvider' })
  async getPropertiesByProvider(@CurrentUser('id') providerId: string) {
    // Lấy trực tiếp providerId đã được Gateway xác thực và truyền sang
    return this.propertiesService.findAllByProvider(providerId);
  }
}
```

---

## 4. Ưu Điểm Của Cơ Chế Bảo Mật Này

1. **Hiệu năng cao**: Chỉ giải mã JWT 1 lần duy nhất tại Gateway, các Microservice bên trong không phải giải mã lại.
2. **Loại bỏ trùng lặp**: Các microservice không cần lưu `JWT_SECRET` hay cài đặt logic xác thực trùng lặp.
3. **Bảo mật phân tầng**: Gateway chặn sạch các request không hợp lệ ngay từ ngoài rìa (Border Protection).
4. **Dễ bảo trì**: Khi nâng cấp phương thức auth (OAuth2, SSO...), chỉ cần thay đổi tại Gateway.
