# ServiceHub Backend Microservices Foundation

Thiết lập bộ khung **NestJS Microservices** thực thụ cho dự án ServiceHub, khắc phục các lỗi kiến trúc hiện tại để hệ thống có thể mở rộng, giao tiếp nội bộ an toàn và quản lý Database độc lập. Đồng thời áp dụng chuẩn **Clean Code** lấy cảm hứng từ cấu trúc Spring Boot của lập trình viên.

Mô hình luồng dữ liệu (Data Flow):
```text
Client (HTTP) -> API Gateway -> [Redis Transport] -> Internal Microservice -> DTO Validation -> Service Logic -> Prisma (Database) -> Response Interceptor -> Client
```

## Proposed Changes

### 1. Áp dụng Mô hình API Gateway + Internal Transporters (Redis)
- **API Gateway**: Mở port HTTP 3000. Xử lý Rate Limiting, Authentication (JWT), và chuyển tiếp request. Bổ sung endpoint Health Check.
  - **Dev-Ready Config**: Cấu hình sẵn `ClientsModule.register()` cho Redis, biến thành Global Module. Tự động đính kèm **Correlation ID (Request ID)** vào mọi Message gửi xuống service con.
- **Internal Services** (Provider, Customer...): Dùng `createMicroservice` giao tiếp với Gateway thông qua **Upstash Redis**.
  - **Lưu ý**: Sẽ **không mở bất kỳ cổng HTTP nào** (xóa bỏ Port 3002 cũ). Mọi việc test độc lập qua Postman sẽ được gọi thông qua API Gateway.

### 2. Cấu trúc thư mục phân lớp nghiêm ngặt (Strict Layering) & Test Scaffolding
- Các service sẽ được sinh sẵn file test boilerplate (`*.spec.ts`) cấu hình sẵn Mock (Prisma, Redis) hệt như `@SpringBootTest`. Sau này Dev chỉ việc nhảy vào file này viết logic test cụ thể.
```text
apps/<service-name>/src/
 ├── controllers/    # Controller + file .spec.ts (Test boilerplate)
 ├── services/       # Service + file .spec.ts (Test boilerplate)
 ├── dto/            # Định nghĩa Class và Validate Payload
 ├── modules/        # Gom nhóm Dependency Injection
```

### 3. Thư mục dùng chung (`libs/common`) - "The Core"
```text
libs/common/src/
 ├── exceptions/     # Global Exception Filter (Format lỗi về { success: false, status: 4xx, message: "...", data: null })
 ├── interceptors/   # Response Interceptor (Bọc data chuẩn FE: { success: true, status: 200, data, message })
 ├── decorators/     # Custom Decorators (vd: @CurrentUser)
 ├── observability/  # [MỚI] Structured Logging và Context/Correlation ID (giúp trace log xuyên suốt từ Gateway)
 ├── constants/      # Enums, Const variables dùng chung
 ├── utils/          # Các hàm helper (DateUtils, StringUtils...)
```

### 4. Database-per-service và Prisma Client Isolation
- Cấu hình lại `generator client` trong 10 schema để trỏ ra thư mục output riêng biệt nhằm tránh đè đè Prisma Client (`output = "../../../node_modules/@prisma/client-provider"`).
- **Dev-Ready Config**: Tạo sẵn `PrismaModule` và `PrismaService` riêng biệt cho từng microservice.

### 5. Quản lý Biến môi trường (.env)
- Loại bỏ toàn bộ các biến `PORT_` dư thừa của các microservices nội bộ.
- Bổ sung cấu hình **Upstash Redis** qua một chuỗi duy nhất (`REDIS_URL="rediss://..."`).
- Bổ sung cấu hình lưu trữ ảnh **Cloudinary** (`CLOUDINARY_URL`).
- Bổ sung `FRONTEND_URL`.
