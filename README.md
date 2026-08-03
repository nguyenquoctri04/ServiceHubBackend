# ServiceHub Backend — Tài Liệu Kỹ Thuật Toàn Diện

> **Mục đích**: File này là nguồn sự thật duy nhất (Single Source of Truth) của dự án. Mọi thành viên trong team và AI assistant đều phải đọc file này trước khi viết bất kỳ dòng code nào. Nó giải thích _hệ thống làm gì_, _hoạt động như thế nào_, và _cách code đúng chuẩn_.

---

## 1. Tổng Quan Dự Án

**Đề tài**: Xây dựng nền tảng quản lý dịch vụ và hợp đồng điện tử tại khu chung cư/nhà trọ bằng kiến trúc Microservices.

**Bản chất hệ thống**: Một **Marketplace 3 chiều** kết nối:

- **Nhà cung cấp dịch vụ — Provider** (chủ trọ, ban quản lý chung cư): đăng ký bất động sản, phòng, dịch vụ, ký hợp đồng với cư dân, thu tiền.
- **Khách hàng / Cư dân — Customer** (người thuê phòng): xem phòng, ký hợp đồng điện tử, thanh toán hóa đơn online.
- **Quản trị viên — Admin**: kiểm duyệt nhà cung cấp, xem audit log, quản lý toàn hệ thống.

**Vấn đề thực tế giải quyết**: Chủ trọ/chung cư đang quản lý bằng giấy tờ — hợp đồng giấy, ghi chỉ số điện nước bằng sổ tay, thu tiền mặt, xử lý vi phạm không có bằng chứng. Hệ thống này **số hóa toàn bộ** quy trình đó: hợp đồng điện tử có chữ ký số, hóa đơn tự động, thanh toán online, nhật ký đầy đủ.

---

## 2. Tech Stack

| Thành phần        | Công nghệ                                                    |
| ----------------- | ------------------------------------------------------------ |
| Framework         | NestJS (TypeScript) — Monorepo                               |
| Database          | PostgreSQL trên Neon Cloud                                   |
| ORM               | Prisma (Code-First)                                          |
| Compiler          | TypeScript (đổi từ SWC để ổn định trong Monorepo Watch mode) |
| Xác thực          | JWT Access Token + Refresh Token                             |
| Giao tiếp Service | REST API (hiện tại) → RabbitMQ (tương lai)                   |
| Deployment        | Neon Cloud DB, service chạy local hoặc Docker                |

---

## 3. Kiến Trúc Hệ Thống

```
┌──────────────────────────────────────────────────────────┐
│                    Client (React Web)                    │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTP Request
                          ▼
┌──────────────────────────────────────────────────────────┐
│                     API GATEWAY                          │
│                       Port 3000                          │
│                                                          │
│  • Điểm truy cập DUY NHẤT của toàn hệ thống             │
│  • Xác thực JWT, kiểm tra quyền (RBAC)                  │
│  • Điều hướng request tới đúng service                  │
│  • Rate Limiting, CORS, Logging                          │
└────────────────────────┬─────────────────────────────────┘
                         │ REST API / Event
          ┌──────────────┼───────────────────┐
          ▼              ▼                   ▼
  [Identity:3001]  [Provider:3002]    [Customer:3003]
  [Property:3004]  [Catalog:3005]     [Contract:3006]
  [Signature:3007] [Billing:3008]     [Notif:3009]
  [Audit:3010]
          │
          ▼
  [PostgreSQL — Neon Cloud]
  Mỗi service có 1 DATABASE riêng biệt hoàn toàn
```

### Nguyên tắc thiết kế QUAN TRỌNG nhất:

> **Database-per-Service**: Mỗi microservice chỉ được đọc/ghi vào DATABASE của chính nó. Tuyệt đối KHÔNG dùng JOIN hay Foreign Key qua lại giữa các service. Muốn lấy dữ liệu từ service khác → gọi REST API hoặc phát/nhận Event.

---

## 4. Cấu Trúc Thư Mục

```
ServiceHubBackend/
├── apps/
│   ├── api-gateway/              # Port 3000
│   │   └── src/
│   │       ├── controllers/
│   │       │   ├── admin/        # /admin/...
│   │       │   ├── customer/     # /customer/...
│   │       │   └── provider/     # /provider/...
│   │       ├── api-gateway.module.ts
│   │       └── main.ts
│   │
│   ├── identity-service/         # Port 3001
│   │   ├── prisma/schema.prisma  # Schema DB riêng của service
│   │   └── src/
│   │       ├── controllers/
│   │       │   ├── admin/
│   │       │   ├── customer/
│   │       │   └── provider/
│   │       ├── services/         # Business logic
│   │       ├── identity-service.module.ts
│   │       └── main.ts
│   │
│   ├── provider-service/         # Port 3002  (cấu trúc tương tự)
│   ├── customer-service/         # Port 3003
│   ├── property-service/         # Port 3004
│   ├── catalog-service/          # Port 3005
│   ├── contract-service/         # Port 3006
│   ├── signature-service/        # Port 3007
│   ├── billing-service/          # Port 3008
│   ├── notification-service/     # Port 3009
│   └── audit-service/            # Port 3010
│
├── libs/
│   └── common/src/
│       └── prisma/
│           └── prisma.service.ts # PrismaService dùng chung cho tất cả services
│
├── .env                          # Biến môi trường thực (BÍ MẬT — không commit)
├── .env.example                  # Template .env để team clone về điền vào
├── nest-cli.json                 # Cấu hình Monorepo NestJS
├── package.json                  # Scripts chạy dự án
└── tsconfig.json                 # Path alias @app/common
```

### Cấu trúc bên trong MỖI service (áp dụng nhất quán cho tất cả):

```
apps/<service-name>/src/
├── controllers/
│   ├── admin/
│   │   └── <service>-admin.controller.ts    # Endpoint cho Admin
│   ├── customer/
│   │   └── <service>-customer.controller.ts # Endpoint cho Customer
│   └── provider/
│       └── <service>-provider.controller.ts  # Endpoint cho Provider
├── services/
│   └── <service>.service.ts                  # Business logic
├── dto/
│   ├── create-<entity>.dto.ts               # DTO tạo mới
│   └── update-<entity>.dto.ts               # DTO cập nhật
├── <service>.module.ts                       # Module chính
└── main.ts                                   # Entry point
```

---

## 5. Phân Chia Công Việc Team

| Thành viên | Phân hệ      | Services phụ trách                                            | Script chạy        |
| ---------- | ------------ | ------------------------------------------------------------- | ------------------ |
| **Trí**    | Hệ thống     | `api-gateway`, `identity`, `billing`, `notification`, `audit` | `npm run start:m3` |
| **Quyên**  | Nhà cung cấp | `provider`, `property`, `catalog`                             | `npm run start:m1` |
| **Hà**     | Khách hàng   | `customer`, `contract`, `signature`                           | `npm run start:m2` |

---

## 6. Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu Cầu Phần Mềm Cần Cài Trước (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính đã cài đầy đủ các công cụ sau:

| Công cụ        | Phiên bản tối thiểu          | Link tải                     | Kiểm tra         |
| -------------- | ---------------------------- | ---------------------------- | ---------------- |
| **Node.js**    | 18.x hoặc 20.x (LTS)         | https://nodejs.org           | `node --version` |
| **npm**        | 9.x trở lên (đi kèm Node.js) | —                            | `npm --version`  |
| **Git**        | Bất kỳ                       | https://git-scm.com          | `git --version`  |
| **NestJS CLI** | 10.x                         | `npm install -g @nestjs/cli` | `nest --version` |

> ⚠️ **Lưu ý**: Dự án dùng **Node.js 20 LTS**. Nếu bạn dùng nhiều version Node khác nhau, hãy cài [nvm](https://github.com/nvm-sh/nvm) để quản lý.

---

### Danh Sách Thư Viện Đã Cài & Vai Trò

Sau khi chạy `npm install`, các thư viện sau được cài:

#### 📦 Dependencies (Runtime — cần thiết khi chạy)

| Thư viện                   | Vai trò                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `@nestjs/common`           | Core NestJS: decorators, pipe, guard, interceptor, exception         |
| `@nestjs/core`             | Engine khởi tạo NestJS application                                   |
| `@nestjs/platform-express` | Adapter để NestJS chạy trên Express.js                               |
| `@nestjs/microservices`    | Hỗ trợ giao tiếp Microservices (RabbitMQ, gRPC... sau này dùng)      |
| `@prisma/client`           | Prisma Client — ORM để query database PostgreSQL                     |
| `class-validator`          | Validate dữ liệu DTO bằng decorator (`@IsEmail`, `@IsString`...)     |
| `class-transformer`        | Chuyển đổi plain object → class instance (dùng cùng class-validator) |
| `dotenv`                   | Load biến môi trường từ file `.env` vào `process.env`                |
| `reflect-metadata`         | Polyfill cho TypeScript decorators (bắt buộc của NestJS)             |
| `rxjs`                     | Lập trình reactive — NestJS dùng nội bộ, dùng cho Observable stream  |

#### 🔧 DevDependencies (Chỉ dùng lúc phát triển — không đi vào production)

| Thư viện                        | Vai trò                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `@nestjs/cli`                   | CLI tool: `nest build`, `nest start`, `nest generate`                              |
| `@nestjs/schematics`            | Tạo boilerplate code: module, service, controller...                               |
| `@nestjs/testing`               | Viết unit test cho NestJS                                                          |
| `prisma`                        | Prisma CLI: `prisma migrate`, `prisma db push`, `prisma generate`, `prisma studio` |
| `typescript`                    | TypeScript compiler                                                                |
| `ts-node`                       | Chạy trực tiếp file `.ts` không cần build trước                                    |
| `ts-loader`                     | Webpack loader để bundle TypeScript                                                |
| `tsconfig-paths`                | Hỗ trợ path alias `@app/common` trong TypeScript                                   |
| `concurrently`                  | Chạy nhiều lệnh song song trong 1 terminal (dùng cho `npm run start:all`)          |
| `source-map-support`            | Hiển thị đúng file/line khi có error trong code đã compile                         |
| `@swc/core`, `@swc/cli`         | Compiler Rust-based (cài sẵn, hiện dùng TSC cho watch mode)                        |
| `@types/express`, `@types/node` | TypeScript type definitions cho Express và Node.js                                 |

---

### Bước 1: Cài Phần Mềm Toàn Cầu (Làm 1 lần duy nhất trên máy)

```bash
# Cài NestJS CLI toàn cục
npm install -g @nestjs/cli

# Kiểm tra cài thành công
nest --version   # Phải hiển thị: 10.x.x
node --version   # Phải hiển thị: v20.x.x
npm --version    # Phải hiển thị: 9.x.x hoặc cao hơn
```

### Bước 2: Clone Dự Án & Cài Dependencies

```bash
# Clone repository
git clone <repo-url>
cd ServiceHubBackend

# Cài toàn bộ thư viện (đọc từ package.json)
npm install

# Nếu gặp lỗi, thử với --legacy-peer-deps
npm install --legacy-peer-deps
```

> Sau khi `npm install` xong, thư mục `node_modules/` sẽ xuất hiện (~500MB). Thư mục này **đã có trong .gitignore**, KHÔNG cần commit.

### Bước 3: Cấu Hình Biến Môi Trường

```bash
# Windows (PowerShell):
Copy-Item .env.example .env

# macOS / Linux:
cp .env.example .env
```

Mở file `.env` vừa tạo và điền thông tin thực tế:

```env
# Ví dụ cấu trúc (xem Neon Dashboard để lấy URL thực)
IDENTITY_DATABASE_URL="postgresql://user:password@host/identity_service_db?sslmode=require"
PORT_IDENTITY_SERVICE=3001
# ... (điền tương tự cho các service của mình)
```

> **Lấy Database URL ở đâu?** Truy cập [console.neon.tech](https://console.neon.tech) → Project → Chọn đúng Database → Copy Connection String.

### Bước 4: Đẩy Schema Lên Database

Chỉ làm lần đầu khi setup, hoặc mỗi khi file `schema.prisma` thay đổi:

```bash
# Trí chạy (phần hệ thống):
npx prisma db push --schema apps/identity-service/prisma/schema.prisma
npx prisma db push --schema apps/billing-service/prisma/schema.prisma
npx prisma db push --schema apps/notification-service/prisma/schema.prisma
npx prisma db push --schema apps/audit-service/prisma/schema.prisma

# Quyên chạy (phần NCC):
npx prisma db push --schema apps/provider-service/prisma/schema.prisma
npx prisma db push --schema apps/property-service/prisma/schema.prisma
npx prisma db push --schema apps/catalog-service/prisma/schema.prisma

# Hà chạy (phần Khách hàng):
npx prisma db push --schema apps/customer-service/prisma/schema.prisma
npx prisma db push --schema apps/contract-service/prisma/schema.prisma
npx prisma db push --schema apps/signature-service/prisma/schema.prisma
```

> `prisma db push` khác với `prisma migrate`: **db push** đồng bộ schema ngay không cần file migration — phù hợp cho development. Khi lên production sẽ chuyển sang `migrate deploy`.

### Bước 5: Generate Prisma TypeScript Types

Sau mỗi lần sửa `schema.prisma`, chạy lệnh này để cập nhật TypeScript types:

```bash
# Generate cho service mình phụ trách
npx prisma generate --schema apps/<ten-service>/prisma/schema.prisma

# Ví dụ:
npx prisma generate --schema apps/identity-service/prisma/schema.prisma
```

### Bước 6: Chạy Hệ Thống

```bash
# Chạy tất cả (ngốn nhiều RAM)
npm run start:all

# Chạy theo nhóm — KHUYẾN NGHỊ
npm run start:m1   # Provider, Property, Catalog
npm run start:m2   # Customer, Contract, Signature
npm run start:m3   # Gateway, Identity, Billing, Notification, Audit
```

### Kiểm tra hệ thống chạy thành công

Mở trình duyệt kiểm tra các endpoint sau đây trả về JSON:

- http://localhost:3000/admin/gateway/status → API Gateway
- http://localhost:3001/admin/identity/status → Identity Service
- http://localhost:3003/customer/customer/status → Customer Service

---

## 7. Hướng Dẫn Viết Code Đúng Chuẩn

### 7.1 Cách thêm Prisma vào một Service

Mỗi service có schema Prisma riêng. Để dùng Prisma trong service, inject `PrismaService` từ `libs/common`:

**Trong `<service>.module.ts`:**

```typescript
import { Module } from "@nestjs/common";
import { PrismaService } from "@app/common/prisma/prisma.service";
import { IdentityService } from "./services/identity.service";
import { IdentityAdminController } from "./controllers/admin/identity-admin.controller";

@Module({
  controllers: [IdentityAdminController],
  providers: [
    IdentityService,
    PrismaService, // <-- Thêm ở đây
  ],
  exports: [PrismaService],
})
export class IdentityServiceModule {}
```

**Trong `<service>.service.ts`:**

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/common/prisma/prisma.service";

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.identity.findMany({
      where: { deletedAt: null }, // Soft delete
    });
  }

  async findById(id: string) {
    return this.prisma.identity.findUnique({ where: { id } });
  }
}
```

### 7.2 Cấu trúc Controller chuẩn

Mỗi service có **3 controller** tách biệt theo vai trò:

```typescript
// controllers/admin/identity-admin.controller.ts
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { IdentityService } from "../../services/identity.service";

@Controller("admin/identity") // Prefix: admin/<service-name>
// @UseGuards(JwtAuthGuard, RolesGuard)  // Bật khi có JWT Guard
// @Roles('ADMIN')
export class IdentityAdminController {
  constructor(private readonly identityService: IdentityService) {}

  @Get("status")
  getStatus() {
    return { status: "OK", service: "identity", role: "ADMIN" };
  }

  @Get()
  findAll() {
    return this.identityService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.identityService.findById(id);
  }
}
```

```typescript
// controllers/customer/identity-customer.controller.ts
@Controller("customer/identity") // Prefix: customer/<service-name>
export class IdentityCustomerController {
  // Chỉ có endpoint mà Customer được phép dùng
}
```

```typescript
// controllers/provider/identity-provider.controller.ts
@Controller("provider/identity") // Prefix: provider/<service-name>
export class IdentityProviderController {
  // Chỉ có endpoint mà Provider được phép dùng
}
```

### 7.3 Cách đặt tên và quy ước code

| Thứ       | Quy tắc                 | Ví dụ                                    |
| --------- | ----------------------- | ---------------------------------------- |
| File      | kebab-case              | `identity-service.module.ts`             |
| Class     | PascalCase              | `IdentityService`                        |
| Method    | camelCase               | `findAll()`, `createIdentity()`          |
| Variable  | camelCase               | `identityId`, `passwordHash`             |
| DB column | snake_case (qua `@map`) | `identity_id`, `created_at`              |
| Enum      | SCREAMING_SNAKE_CASE    | `ACTIVE`, `WAITING_SIGN`                 |
| DTO       | PascalCase + hậu tố Dto | `CreateIdentityDto`, `UpdateProviderDto` |

### 7.4 Viết DTO đúng cách

```typescript
// dto/create-identity.dto.ts
import { IsEmail, IsString, MinLength, IsIn } from "class-validator";

export class CreateIdentityDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(["ADMIN", "PROVIDER", "CUSTOMER"])
  role: string;
}
```

### 7.5 Quy tắc liên kết giữa các Service

Giữa các service **KHÔNG** dùng Foreign Key database. Chỉ lưu UUID và gọi API:

```typescript
// ❌ SAI — Không được làm thế này (JOIN qua service khác)
// Contract service không được truy cập DB của Identity service

// ✅ ĐÚNG — Lưu UUID, khi cần thì gọi API
// Trong contract-service, khi cần thông tin Identity:
async getContractWithParticipantInfo(contractId: string) {
  const contract = await this.prisma.contract.findUnique({
    where: { id: contractId },
    include: { participants: true },
  });

  // Gọi Identity Service qua HTTP để lấy thông tin
  const identityInfo = await this.httpService.get(
    `http://localhost:3001/admin/identity/${contract.participants[0].residentId}`
  );

  return { contract, identityInfo: identityInfo.data };
}
```

### 7.6 Soft Delete — Xóa Mềm

Các model có trường `deletedAt` áp dụng soft delete. KHÔNG xóa record thật:

```typescript
// ✅ Soft Delete đúng cách
async softDelete(id: string) {
  return this.prisma.identity.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ✅ Query luôn lọc soft deleted
async findAll() {
  return this.prisma.identity.findMany({
    where: { deletedAt: null },  // Bắt buộc!
  });
}
```

---

## 8. Chi Tiết Từng Service & Nghiệp Vụ

### 8.1 API Gateway (Port 3000) — Trí

**Vai trò**: Cổng vào DUY NHẤT. Client không được gọi thẳng vào service.

**Prefix URL mẫu**:

- `/admin/...` → Chỉ Admin mới gọi được
- `/customer/...` → Customer đã đăng nhập
- `/provider/...` → Provider đã đăng nhập

**TODO**:

- [ ] Tích hợp JWT Guard (xác thực token)
- [ ] Forward/Proxy request đến service phía sau
- [ ] Rate Limiting (`@nestjs/throttler`)
- [ ] Global Exception Filter

---

### 8.2 Identity & eKYC Service (Port 3001) — Trí

**Vai trò**: Quản lý tài khoản đăng nhập. Lưu email, password hash, vai trò. **KHÔNG** lưu họ tên, địa chỉ (cái đó thuộc Customer/Provider service).

**Database**: `identity_service_db`

**Schema chính** (xem `apps/identity-service/prisma/schema.prisma`):

- `Identity`: email, passwordHash, status, roleId, isEkycVerified
- `Role`: ADMIN / PROVIDER / CUSTOMER
- `Permission`: quyền chi tiết (resource + action)
- `RolePermission`: bảng trung gian Role ↔ Permission
- `IdentityVerification`: lịch sử xác minh eKYC
- `IdentityDocument`: dữ liệu OCR từ CCCD/Passport
- `AuthenticationHistory`: lịch sử đăng nhập

**API cần xây dựng**:

```
POST   /customer/identity/register         # Đăng ký
POST   /customer/identity/login            # Đăng nhập → trả JWT
POST   /customer/identity/refresh          # Làm mới Access Token
POST   /customer/identity/logout           # Đăng xuất
POST   /customer/identity/ekyc/submit      # Gửi ảnh CCCD + selfie lên eKYC
GET    /customer/identity/me               # Lấy thông tin tài khoản đang login
GET    /admin/identity                     # Admin: xem danh sách tài khoản
PATCH  /admin/identity/:id/status          # Admin: khóa/mở tài khoản
GET    /admin/identity/roles               # Admin: quản lý vai trò
```

---

### 8.3 Provider Service (Port 3002) — Quyên

**Vai trò**: Quản lý hồ sơ Nhà cung cấp dịch vụ. Mỗi Provider là một Tenant độc lập.

**Database**: `provider_service_db`

**Schema chính** (xem `apps/provider-service/prisma/schema.prisma`):

- `Provider`: identityId (UUID từ Identity service), providerCode, providerName, thông tin công ty, ngân hàng, trạng thái
- `ProviderLegalDocument`: Giấy phép kinh doanh, PCCC, chứng nhận thuế
- `ProviderSetting`: cặp key-value cấu hình riêng của từng Provider
- `ProviderStatistic`: thống kê số property, khách hàng, dịch vụ

**Liên kết với service khác**:

- `Provider.identityId` → `Identity.id` (Identity Service) — chỉ lưu UUID, không có FK

**API cần xây dựng**:

```
POST   /provider/provider/register         # Provider tự đăng ký hồ sơ
GET    /provider/provider/me               # Xem hồ sơ của mình
PUT    /provider/provider/me               # Cập nhật hồ sơ
POST   /provider/provider/documents        # Upload tài liệu pháp lý
GET    /admin/provider                     # Admin: danh sách nhà cung cấp
PATCH  /admin/provider/:id/status          # Admin: duyệt/từ chối/tạm khóa
GET    /admin/provider/:id/documents       # Admin: xem tài liệu pháp lý
```

---

### 8.4 Customer Service (Port 3003) — Hà

**Vai trò**: Quản lý hồ sơ cá nhân của cư dân/khách hàng. **KHÔNG** quản lý tài khoản đăng nhập.

**Database**: `customer_service_db`

**Schema chính** (xem `apps/customer-service/prisma/schema.prisma`):

- `Resident`: identityId (UUID), status (ACTIVE/INACTIVE/BLOCKED)
- `EmergencyContact`: người liên hệ khẩn cấp cho Resident

**Liên kết với service khác**:

- `Resident.identityId` → `Identity.id` (Identity Service)

**API cần xây dựng**:

```
POST   /customer/customer/profile          # Tạo hồ sơ sau khi đăng ký
GET    /customer/customer/profile          # Xem hồ sơ của mình
PUT    /customer/customer/profile          # Cập nhật hồ sơ
POST   /customer/customer/emergency-contact # Thêm người liên hệ khẩn cấp
GET    /admin/customer                     # Admin: danh sách cư dân
PATCH  /admin/customer/:id/status          # Admin: khóa/mở tài khoản cư dân
GET    /provider/customer/:id              # Provider: xem hồ sơ cư dân trong HD
```

---

### 8.5 Property Management Service (Port 3004) — Quyên

**Vai trò**: Quản lý tài sản vật lý — bất động sản, tòa nhà, tầng, phòng.

**Database**: `property_service_db`

**Schema chính** (xem `apps/property-service/prisma/schema.prisma`):

- `Property`: nhà trọ / chung cư / KTX / co-living / văn phòng
- `Block`: tòa nhà A, B, C... (tùy chọn)
- `Floor`: tầng 1, 2, 3... (tùy chọn)
- `RoomType`: loại phòng (diện tích, sức chứa tối đa)
- `Room`: phòng cụ thể — số phòng, diện tích, trạng thái (AVAILABLE/OCCUPIED/MAINTENANCE/RESERVED)
- `RoomImage`: hình ảnh phòng
- `RoomServiceAssignment`: dịch vụ gán cho phòng (serviceId tham chiếu Catalog service)
- `MeterReading`: chỉ số đồng hồ điện/nước định kỳ
- `RepairRequest`: yêu cầu sửa chữa từ cư dân

**Liên kết với service khác**:

- `Property.providerId` → `Provider.id` (Provider Service)
- `RoomServiceAssignment.serviceId` → `Service.id` (Catalog Service)
- `MeterReading.contractId` → `Contract.id` (Contract Service)

**API cần xây dựng**:

```
POST   /provider/property                  # Tạo Property
GET    /provider/property                  # Danh sách Property của tôi
POST   /provider/property/:id/blocks       # Thêm Block
POST   /provider/property/:id/rooms        # Tạo phòng
GET    /provider/property/:id/rooms        # Danh sách phòng
PATCH  /provider/property/rooms/:id/status # Đổi trạng thái phòng
POST   /provider/property/meter-reading    # Ghi chỉ số điện nước
GET    /customer/property/rooms            # Khách xem phòng trống (AVAILABLE)
POST   /customer/property/repair-request   # Khách yêu cầu sửa chữa
```

---

### 8.6 Service Catalog Service (Port 3005) — Quyên

**Vai trò**: Quản lý danh mục dịch vụ và bảng giá. Là nguồn dữ liệu chuẩn (Source of Truth) về giá tiền.

**Database**: `catalog_service_db`

**Schema chính** (xem `apps/catalog-service/prisma/schema.prisma`):

- `ServiceCategory`: nhóm dịch vụ (Điện, Nước, Internet, Giữ xe...)
- `Unit`: đơn vị tính (kWh, m³, tháng, phòng...)
- `Service`: dịch vụ cụ thể của từng Provider
- `ServicePrice`: lịch sử giá (record cuối effectiveTo=NULL là giá hiện tại)
- `ServicePriceTier`: giá bậc thang (0-50kWh giá A, 51-100kWh giá B...)

**Liên kết với service khác**:

- `Service.providerId` → `Provider.id` (Provider Service)

**API cần xây dựng**:

```
GET    /customer/catalog/categories        # Danh mục dịch vụ
GET    /customer/catalog/services          # Dịch vụ của Provider
POST   /provider/catalog/services          # Provider tạo dịch vụ
PUT    /provider/catalog/services/:id      # Cập nhật dịch vụ
POST   /provider/catalog/services/:id/price # Cập nhật bảng giá
GET    /admin/catalog/services             # Admin xem tất cả dịch vụ
```

---

### 8.7 Contract Management Service (Port 3006) — Hà

**Vai trò**: Quản lý vòng đời hợp đồng điện tử. Xác định ai thuê phòng nào, từ bao giờ đến bao giờ.

**Database**: `contract_service_db`

**Luồng trạng thái hợp đồng**:

```
DRAFT → WAITING_SIGN → ACTIVE → EXPIRED
                     ↘ TERMINATED
                     ↘ CANCELLED
```

**Schema chính** (xem `apps/contract-service/prisma/schema.prisma`):

- `ContractTemplate`: mẫu hợp đồng với biến `{{tenant_name}}`, `{{room_number}}`
- `TemplateVariable`: danh sách biến hợp lệ trong mẫu
- `Contract`: hợp đồng thực — contractCode, status, pdfUrl, hashContract, signedAt
- `ContractParticipant`: LANDLORD + TENANT + CO_TENANT
- `Term`: điều khoản chung của hệ thống
- `ContractTerm`: điều khoản gán vào hợp đồng cụ thể
- `Violation`: vi phạm hợp đồng + bằng chứng
- `Evidence`: hình ảnh/tài liệu bằng chứng vi phạm
- `ViolationAction`: hành động xử lý vi phạm (cảnh báo, phạt, trừ cọc, chấm dứt HD)

**Liên kết với service khác**:

- `Contract.providerId` → `Provider.id`
- `ContractParticipant.residentId` → `Resident.id` (Customer Service)

**API cần xây dựng**:

```
POST   /provider/contract/templates        # Tạo mẫu hợp đồng
GET    /provider/contract/templates        # Danh sách mẫu
POST   /provider/contract                  # Tạo hợp đồng từ mẫu
GET    /provider/contract                  # Danh sách hợp đồng
PATCH  /provider/contract/:id/status       # Chuyển trạng thái
POST   /provider/contract/:id/violation    # Ghi nhận vi phạm
GET    /customer/contract/my              # Khách xem hợp đồng của mình
POST   /customer/contract/:id/evidence    # Khách submit bằng chứng
```

---

### 8.8 Digital Signature Service (Port 3007) — Hà

**Vai trò**: Quản lý quy trình ký số hợp đồng điện tử bằng GPG Key.

**Database**: `signature_service_db`

**Schema chính** (xem `apps/signature-service/prisma/schema.prisma`):

- `GnupgKey`: cặp khóa public/private của mỗi người dùng
- `ContractSignature`: bản ghi chữ ký số — trạng thái (PENDING/SIGNED/FAILED/REJECTED)

**API cần xây dựng**:

```
POST   /customer/signature/generate-key   # Tạo cặp GPG Key cho người dùng
POST   /signature/sign/:contractId        # Ký hợp đồng
GET    /signature/status/:contractId      # Kiểm tra trạng thái ký
```

---

### 8.9 Billing & Payment Service (Port 3008) — Trí

**Vai trò**: Tạo hóa đơn, ghi nhận thanh toán. Tính toán dựa trên dữ liệu từ Property Service (chỉ số điện nước) và Catalog Service (đơn giá).

**Database**: `billing_service_db`

**Schema chính** (xem `apps/billing-service/prisma/schema.prisma`):

- `Invoice`: hóa đơn theo kỳ — contractId, billingPeriod, totalAmount, status, dueDate
- `InvoiceItem`: chi tiết từng khoản (tiền phòng, tiền điện, tiền nước, dịch vụ khác)
- `Payment`: ghi nhận thanh toán — phương thức, trạng thái, thời gian

**Luồng trạng thái hóa đơn**: `DRAFT → ISSUED → PAID` hoặc `OVERDUE` hoặc `CANCELLED`

**Liên kết với service khác**:

- `Invoice.contractId` → `Contract.id`
- `InvoiceItem.serviceId` → `Service.id` (Catalog Service)

**API cần xây dựng**:

```
POST   /provider/billing/invoice           # Tạo hóa đơn
GET    /provider/billing/invoice           # Danh sách hóa đơn
GET    /customer/billing/invoice           # Khách xem hóa đơn của mình
POST   /customer/billing/payment/:invoiceId# Khách thanh toán
GET    /admin/billing/invoice              # Admin xem tất cả hóa đơn
```

---

### 8.10 Notification Service (Port 3009) — Trí

**Vai trò**: Gửi thông báo. Các service khác phát event, service này nghe và gửi.

**Database**: `notification_service_db`

**Schema chính** (xem `apps/notification-service/prisma/schema.prisma`):

- `NotificationTemplate`: mẫu thông báo theo code
- `Notification`: lịch sử thông báo đã gửi — kênh (EMAIL/SMS/PUSH/IN_APP), trạng thái

**API cần xây dựng**:

```
GET    /customer/notification              # Khách xem thông báo của mình
PATCH  /customer/notification/:id/read    # Đánh dấu đã đọc
POST   /admin/notification/send           # Admin gửi thông báo hàng loạt
POST   /admin/notification/templates      # Admin quản lý mẫu thông báo
```

---

### 8.11 Audit Log Service (Port 3010) — Trí

**Vai trò**: Ghi nhật ký mọi thao tác theo chuẩn ISO/IEC. Dùng để truy vết, kiểm toán.

**Database**: `audit_service_db`

**Schema chính** (xem `apps/audit-service/prisma/schema.prisma`):

- `AuditLog`: userId, serviceName, action (ENUM), entityType, entityId, oldData (JSONB), newData (JSONB), ipAddress

**Cách ghi audit log từ các service khác** (gọi thẳng hoặc qua event):

```typescript
// Trong các service khác, sau mỗi thao tác quan trọng:
await this.httpService
  .post("http://localhost:3010/internal/audit", {
    userId: currentUser.id,
    serviceName: "contract-service",
    action: "SIGN_CONTRACT",
    entityType: "Contract",
    entityId: contract.id,
    oldData: { status: "WAITING_SIGN" },
    newData: { status: "ACTIVE" },
    ipAddress: req.ip,
  })
  .toPromise();
```

---

## 9. Luồng Nghiệp Vụ Chi Tiết

### 9.1 Đăng ký tài khoản & eKYC

```
1. User gửi email + password + role → POST /customer/identity/register
2. Identity Service tạo Identity record (status: INACTIVE)
3. Gửi OTP qua email (Notification Service)
4. User nhập OTP → POST /customer/identity/verify-otp
5. Identity Service kích hoạt (status: ACTIVE)
6. User upload ảnh CCCD mặt trước, sau + selfie → POST /customer/identity/ekyc/submit
7. Hệ thống gọi API eKYC bên thứ 3 (VNPT AI / FPT AI)
8. Nhận kết quả → Lưu IdentityVerification + IdentityDocument
9. Nếu thành công: isEkycVerified = true
```

### 9.2 Provider tạo bất động sản và phòng

```
1. Provider đăng nhập → JWT
2. Tạo hồ sơ Provider → POST /provider/provider/register
3. Tạo Property (chung cư A) → POST /provider/property
4. Tạo Block (Tòa B1, B2...) → POST /provider/property/:id/blocks [tùy chọn]
5. Tạo Floor (Tầng 1, 2...) tương tự [tùy chọn]
6. Tạo RoomType (Studio, 1PN, 2PN)
7. Tạo Room cụ thể (B1-101, B1-102...) → POST /provider/property/:id/rooms
8. Upload hình ảnh phòng
9. Gán dịch vụ cho phòng (Điện, Nước, Internet) từ Service Catalog
```

### 9.3 Tạo hợp đồng và ký số

```
1. Provider tạo mẫu hợp đồng → POST /provider/contract/templates
2. Chọn cư dân + phòng → Tạo hợp đồng từ mẫu → POST /provider/contract
   Hệ thống điền biến: {{tenant_name}}, {{room_number}}, {{start_date}}, {{price}}
3. Thêm ContractParticipant (LANDLORD + TENANT)
4. Thêm điều khoản ContractTerm
5. Xuất PDF hợp đồng → Lưu pdfUrl + hashContract
6. Status: DRAFT → WAITING_SIGN
7. Notification Service gửi thông báo mời ký cho cả 2 bên
8. Cả 2 bên ký số (GPG) qua Signature Service → PENDING → SIGNED
9. Sau khi tất cả ký xong → Contract status: ACTIVE
10. Room status → OCCUPIED
```

### 9.4 Lập hóa đơn hàng tháng

```
1. Đầu tháng: Provider ghi chỉ số điện/nước → POST /provider/property/meter-reading
2. Billing Service tự động (hoặc thủ công) tạo Invoice cho từng hợp đồng ACTIVE
3. Lấy giá từ Catalog Service (gọi API): tiền phòng + đơn giá điện + đơn giá nước
4. Tạo InvoiceItem cho từng khoản thu
5. Tính totalAmount, đặt dueDate (ví dụ: ngày 10 tháng sau)
6. Phát hành hóa đơn: status = ISSUED
7. Notification Service gửi thông báo hóa đơn cho cư dân (email + in-app)
8. Cư dân thanh toán → POST /customer/billing/payment/:invoiceId
9. Gọi cổng thanh toán (PayOS, VNPay...) → Lưu Payment
10. Xác nhận thanh toán thành công → Invoice status: PAID
11. Ghi AuditLog: PAY_INVOICE
```

### 9.5 Xử lý vi phạm hợp đồng

```
1. Phát hiện vi phạm (tiếng ồn, nuôi thú cưng, phá hoại tài sản...)
2. Tạo Violation gắn với Contract → POST /provider/contract/:id/violation
3. Upload bằng chứng (ảnh/video) → Evidence
4. Notification gửi cảnh báo cho cư dân
5. Admin/Provider xem xét → Tạo ViolationAction:
   - WARNING: cảnh báo
   - REQUEST_CORRECTION: yêu cầu khắc phục
   - FINE: phạt tiền (tạo InvoiceItem thêm trong hóa đơn)
   - DEDUCT_DEPOSIT: trừ tiền đặt cọc
   - TERMINATE_CONTRACT: chấm dứt hợp đồng
6. Ghi AuditLog về toàn bộ quá trình
```

### 9.6 Trả phòng và quyết toán

```
1. Cư dân báo trả phòng trước N ngày theo điều khoản hợp đồng
2. Provider kiểm tra tình trạng phòng, ghi MeterReading cuối
3. Tạo Invoice quyết toán:
   - Tiền thuê lẻ ngày (nếu ra giữa tháng)
   - Tiền điện/nước còn lại
   - Tiền phạt vi phạm (nếu có)
   - Trừ tiền đặt cọc
4. Cư dân thanh toán quyết toán
5. Contract status: TERMINATED
6. Room status: AVAILABLE (sẵn sàng cho thuê lại)
7. Ghi AuditLog: TERMINATE_CONTRACT
```

---

## 10. Cổng URL API theo Vai Trò

| Prefix          | Dành cho                       | Cần xác thực?       |
| --------------- | ------------------------------ | ------------------- |
| `/admin/...`    | Admin                          | JWT + Role ADMIN    |
| `/provider/...` | Nhà cung cấp                   | JWT + Role PROVIDER |
| `/customer/...` | Khách hàng/Cư dân              | JWT + Role CUSTOMER |
| `/internal/...` | Giao tiếp nội bộ giữa services | IP Whitelist        |
| `/public/...`   | Không cần đăng nhập            | Không               |

---

## 11. Quy Tắc Liên Kết Giữa Các Service

| Service nguồn       | UUID lưu trữ           | Service đích       | Cách lấy dữ liệu                       |
| ------------------- | ---------------------- | ------------------ | -------------------------------------- |
| Provider            | `identityId`           | Identity           | Gọi `GET /admin/identity/{id}`         |
| Resident            | `identityId`           | Identity           | Gọi `GET /admin/identity/{id}`         |
| Property            | `providerId`           | Provider           | Gọi `GET /admin/provider/{id}`         |
| Room                | —                      | Property           | Cùng service                           |
| Contract            | `providerId`, `roomId` | Provider, Property | Gọi API tương ứng                      |
| ContractParticipant | `residentId`           | Customer           | Gọi `GET /admin/customer/{id}`         |
| Invoice             | `contractId`           | Contract           | Gọi `GET /admin/contract/{id}`         |
| InvoiceItem         | `serviceId`            | Catalog            | Gọi `GET /admin/catalog/services/{id}` |
| ContractSignature   | `contractId`           | Contract           | Gọi `GET /admin/contract/{id}`         |
| Notification        | `userId`               | Identity           | UUID — không cần gọi thêm              |
| AuditLog            | `entityId`             | Bất kỳ             | UUID — chỉ ghi log, không join         |

> ⚠️ **Nguyên tắc bất biến**: Giữa 2 database của 2 service khác nhau tuyệt đối KHÔNG tạo Foreign Key. Chỉ lưu UUID và giao tiếp qua REST API.

---

## 12. Yêu Cầu Chất Lượng

| Yêu cầu                      | Mức độ                                       |
| ---------------------------- | -------------------------------------------- |
| Tính toán tiền tệ sai số = 0 | Dùng `Decimal(18,2)` + thư viện `decimal.js` |
| Mật khẩu phải mã hóa         | Argon2 hoặc BCrypt (salt rounds ≥ 10)        |
| JWT Access Token             | Hết hạn sau 30 phút                          |
| JWT Refresh Token            | Hết hạn sau 7 ngày                           |
| Soft delete                  | Không xóa record thật, chỉ đặt `deletedAt`   |
| Tạo hóa đơn toàn bộ          | ≤ 10 giây/tháng cho toàn hệ thống            |
| Rollback thanh toán          | Giao dịch thất bại phải rollback hoàn toàn   |
| Database-per-Service         | Bắt buộc, không ngoại lệ                     |

---

## 13. Lệnh Tiện Ích

```bash
# Chạy hệ thống
npm run start:all                                                          # Tất cả
npm run start:m1                                                           # Provider, Property, Catalog
npm run start:m2                                                           # Customer, Contract, Signature
npm run start:m3                                                           # Gateway, Identity, Billing, Notification, Audit

# Prisma — Đẩy schema lên DB (không dùng migrate để tránh version conflict trong dev)
npx prisma db push --schema apps/<service>/prisma/schema.prisma

# Prisma — Generate TypeScript types sau khi sửa schema
npx prisma generate --schema apps/<service>/prisma/schema.prisma

# Prisma — Xem dữ liệu trong DB (giao diện web)
npx prisma studio --schema apps/<service>/prisma/schema.prisma

# Build toàn bộ dự án
npm run build

# Kiểm tra TypeScript errors
npm run type-check
```
