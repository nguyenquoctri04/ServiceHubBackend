# ServiceHub — Tài liệu hệ thống

> Tài liệu tổng hợp về kiến trúc backend, bảo mật, thư viện sử dụng và hướng dẫn chạy toàn bộ hệ thống (BE + FE + AI Server).
> File `CONTEXT.md` chứa chi tiết kỹ thuật từng service, đọc song song với file này.

---

## 1. Tổng quan kiến trúc

ServiceHub là một **marketplace 3 chiều** số hóa quản lý bất động sản, hợp đồng điện tử và thanh toán, kết nối:
- **Provider** (chủ trọ, ban quản lý chung cư)
- **Customer** (cư dân, người thuê)
- **Admin** (quản trị viên hệ thống)

### Kiến trúc NestJS Microservices

```
Client (React — port 5173)
    │
    │ HTTP
    ▼
API Gateway (port 3000) ← Điểm vào DUY NHẤT
    │ Redis pub/sub (RPC)
    ├─► identity-service
    ├─► catalog-service
    ├─► contract-service
    ├─► signature-service
    ├─► billing-service
    ├─► notification-service
    └─► audit-service
    │
    ▼
PostgreSQL (Neon Cloud) — mỗi service có DB riêng

Python AI Server (port 8000) ← identity-service gọi HTTP khi eKYC
```

**Nguyên tắc quan trọng:** Mỗi microservice chỉ được đọc/ghi vào database của chính nó. Không JOIN hay Foreign Key qua database khác.

---

## 2. Luồng hoạt động Backend

### 2.1 Authentication (JWT)

```
POST /api/auth/login
    → Gateway → Identity Service
    → Bcrypt verify password
    → Tạo Access Token (15 phút) + Refresh Token (7 ngày)
    → Refresh Token lưu DB + set HttpOnly cookie
    ← { accessToken, user }

POST /api/auth/refresh
    → Đọc refresh_token cookie
    → Verify, rotate token
    ← { accessToken, user }
```

### 2.2 Request flow (mọi API có auth)

```
Client gửi request với header: Authorization: Bearer <access_token>
    ↓
API Gateway:
    1. JwtAuthGuard — verify JWT signature + expiry
    2. RolesGuard — kiểm tra role (ADMIN / PROVIDER / CUSTOMER)
    3. ThrottlerGuard — rate limiting (100 req/60s global, 5 req/60s auth)
    4. SecureRpcService.send() — đóng gói payload + HMAC signature → Redis
    ↓
Microservice (ví dụ Identity Service):
    5. HmacGuard — verify HMAC signature
    6. ReplayProtectionService — check requestId chống replay attack
    7. Handler xử lý nghiệp vụ
    8. PrismaService → PostgreSQL
    ↓
Response qua Redis → Gateway → Client
```

### 2.3 eKYC flow (2 bước)

```
Bước 1 — OCR CCCD:
    POST /api/customer/identity/ekyc/ocr (front_image multipart)
    → Gateway → SecureRpc → Identity Service
    → HTTP POST http://host.docker.internal:8000/ekyc/ocr
    → Python: CCCDPipeline.run() → OCR info
    ← { success, ocr_info: { card_id, full_name, date_of_birth, ... } }
    Không lưu DB, chỉ trả thông tin cho FE hiển thị

Bước 2 — Face Verification:
    POST /api/customer/identity/ekyc/verify-face (front_image + selfie)
    → Gateway → SecureRpc → Identity Service
    → HTTP POST http://host.docker.internal:8000/ekyc/verify-face
    → Python: CCCDPipeline.run() + MTCNN + VGGFace2
    → Euclidean distance < 0.7 → MATCH
    ← { success, face_matched, face_similarity, ocr_info }
    Nếu match → lưu IdentityVerification + IdentityDocument → isEkycVerified=true
    Nếu không match → không thay đổi DB
```

---

## 3. Bảo mật

### 3.1 Lớp bảo mật tại API Gateway

| Lớp | Cơ chế | Mô tả |
|---|---|---|
| **JWT Auth** | `JwtAuthGuard` | Verify access token, đính user payload vào request |
| **RBAC** | `RolesGuard` | Kiểm tra role: ADMIN / PROVIDER / CUSTOMER |
| **Rate Limit** | `ThrottlerGuard` (Redis) | Global: 100 req/60s; Auth routes: 5 req/60s, block 5 phút |
| **Exposed port** | `compose.yml` | Chỉ port 3000 (Gateway) expose ra ngoài. Các service khác chỉ trong Docker network |

### 3.2 HMAC — bảo mật giao tiếp giữa services

Mọi RPC call từ Gateway đến microservice đều được bảo vệ bằng HMAC-SHA256:

```
Gateway (SecureRpcService.send):
    1. Tạo requestId (UUID), timestamp, HMAC signature
    2. Đóng gói: { meta: { service, timestamp, requestId, signature }, data }
    3. Publish lên Redis

Microservice (HmacGuard.canActivate):
    4. Verify HMAC signature bằng shared secret (từ .env)
    5. Check timestamp tolerance (± 30 giây)
    6. Check requestId chưa dùng (Redis TTL 30s) → chống replay attack
    7. args[0] = request.data → controller nhận DTO sạch
```

**Secrets** được cấu hình riêng cho từng service trong `.env`:
```
API_GATEWAY_SECRET=...
IDENTITY_SERVICE_SECRET=...
CATALOG_SERVICE_SECRET=...
... (mỗi service một secret khác nhau)
```

### 3.3 Token security

- **Access Token**: JWT, expire 15 phút, không lưu server-side
- **Refresh Token**: opaque token, lưu DB (hash), rotate mỗi lần refresh, expire 7 ngày
- **Refresh Token cookie**: `HttpOnly`, `SameSite: Lax`, `Secure` trên production

### 3.4 Validation

- `ValidationPipe({ whitelist: true, transform: true })` — tự động strip field không có decorator trên tất cả microservice
- Mọi DTO phải khai báo `@Allow()` hoặc các decorator cụ thể từ `class-validator`

---

## 4. Thư viện sử dụng

### Backend (NestJS)

| Thư viện | Vai trò |
|---|---|
| `@nestjs/common`, `@nestjs/core` | Core NestJS framework |
| `@nestjs/microservices` | Redis transport cho inter-service RPC |
| `@nestjs/jwt`, `@nestjs/passport` | JWT authentication |
| `@nestjs/axios` | HTTP client (gọi Python AI service) |
| `@nestjs/throttler` | Rate limiting |
| `@prisma/client` | ORM cho PostgreSQL |
| `class-validator`, `class-transformer` | DTO validation |
| `bcrypt` | Password hashing |
| `ioredis` | Redis client (broker + cache) |
| `cookie-parser` | Đọc HttpOnly refresh token cookie |
| `helmet` | HTTP security headers |
| `form-data` | Gửi multipart/form-data tới Python server |
| `uuid` | Tạo requestId cho HMAC |

### Frontend (React + Vite)

| Thư viện | Vai trò |
|---|---|
| `react`, `react-dom` | UI framework |
| `vite` | Build tool + dev server |
| `typescript` | Type safety |
| `axios` | HTTP client |
| `react-router-dom` | Client-side routing |
| `zustand` | State management (auth store) |
| `react-hook-form` | Form handling |
| `lucide-react` | Icon library |
| `tailwindcss` | Utility-first CSS |

### Infrastructure

| Thứ | Công nghệ |
|---|---|
| Container | Docker + Docker Compose |
| Message broker | Redis 8 (Alpine) |
| Database | PostgreSQL (Neon Cloud) |
| Image registry | Docker Hub |

---

## 5. Cấu trúc thư mục

```
ServiceHubBackend/
├── apps/
│   ├── api-gateway/          ← Port 3000, điểm vào HTTP duy nhất
│   │   └── src/
│   │       ├── auth/         ← Login, register, refresh, logout
│   │       ├── customer/     ← Routes /api/customer/*
│   │       │   └── identity/
│   │       │       ├── ekyc/           ← OCR + face verify endpoints
│   │       │       └── identities/     ← Profile settings
│   │       ├── provider/     ← Routes /api/provider/*
│   │       └── proxy/        ← GatewayProxyService
│   ├── identity-service/     ← Auth, eKYC, roles
│   ├── catalog-service/      ← Dịch vụ, danh mục, bảng giá
│   ├── contract-service/     ← Hợp đồng, vi phạm
│   ├── signature-service/    ← Chữ ký số GPG
│   ├── billing-service/      ← Hóa đơn, thanh toán
│   ├── notification-service/ ← Thông báo
│   └── audit-service/        ← Audit log
├── libs/common/src/
│   ├── constants/            ← customer.patterns.ts, customer.endpoint.ts
│   ├── guards/               ← HmacGuard, JwtAuthGuard, RolesGuard
│   ├── security/             ← SecureRpcService, HmacService, ReplayProtection
│   ├── interceptors/         ← ResponseInterceptor (wrap {success,data,message})
│   ├── exceptions/           ← GlobalExceptionFilter
│   └── decorators/           ← @CurrentUser()
├── compose.yml               ← Docker Compose production
├── compose.dev.yml           ← Docker Compose development
├── Dockerfile                ← Build image cho tất cả NestJS services
├── .env                      ← Biến môi trường thực (không commit)
├── .env.example              ← Template
└── CONTEXT.md                ← Chi tiết kỹ thuật từng service
```

---

## 6. Hướng dẫn chạy hệ thống

### Yêu cầu

| Phần mềm | Phiên bản |
|---|---|
| Node.js | 20 LTS |
| Docker Desktop | >= 4.x (RAM: tối thiểu 8GB) |
| Python | 3.11 |

### Cách 1: Chạy Backend bằng Docker (khuyến nghị)

```powershell
# 1. Clone repo và cài dependencies FE
cd "e:\Do an thuc tap tot nghiep\Project\ServiceHubBackend"

# 2. Đảm bảo Docker Desktop đang chạy với RAM >= 8GB
# Docker Desktop → Settings → Resources → Memory: 8192 MB

# 3. Build và khởi động tất cả services
docker compose up -d

# 4. Kiểm tra tất cả containers đang chạy
docker ps

# Các container sẽ có:
# servicehub-redis           (healthy)
# servicehub-api-gateway     (Up, port 3000)
# servicehub-identity-service
# servicehub-catalog-service
# servicehub-contract-service
# servicehub-signature-service
# servicehub-billing-service
# servicehub-notification-service
# servicehub-audit-service
```

**Lần đầu chạy cần seed data:**
```powershell
npm run seed:identity
npm run seed:catalog
npm run seed:contract
npm run seed:billing
```

### Cách 2: Chạy Backend bằng Node.js local (cho development)

```powershell
cd "e:\Do an thuc tap tot nghiep\Project\ServiceHubBackend"

# Cài dependencies
npm install

# Cần Redis đang chạy — chạy Redis container riêng
# Sửa .env: REDIS_BROKER_URL="redis://:123456789@localhost:6380"
# REDIS_CACHE_URL="redis://:123456789@localhost:6380"
docker run -d --name redis-dev -p 6380:6379 redis:8-alpine redis-server --requirepass 123456789

# Chạy tất cả services
npm run start:all

# Hoặc chạy theo nhóm
npm run start:m3   # Gateway + Identity + Billing + Notification + Audit
npm run start:m2   # Contract + Signature
npm run start:m1   # Catalog
```

### Khởi động Python AI Server

```powershell
cd "e:\Do an thuc tap tot nghiep\Project\eKYC"

# Kích hoạt virtual environment
.venv\Scripts\Activate.ps1

# Khởi động server (giữ terminal này mở)
python -m uvicorn api_server:app --host 0.0.0.0 --port 8000

# Chờ thấy: "All models loaded. Server ready."
# Server sẽ load khoảng 20-30 giây
```

### Khởi động Frontend

```powershell
cd "e:\Do an thuc tap tot nghiep\Project\ServiceHub_FE"

npm install    # lần đầu
npm run dev    # khởi động dev server

# Mở trình duyệt: http://localhost:5173
```

### Tài khoản test (sau khi seed)

| Email | Password | Role |
|---|---|---|
| `admin@servicehub.vn` | `123456` | Admin |
| `khachhang1@servicehub.vn` | `123456` | Customer |
| `trikhachhang@servicehub.vn` | `123456` | Customer |
| `nhacungcap1@servicehub.vn` | `123456` | Provider |

---

## 7. Troubleshooting thường gặp

### Lỗi 429 Too Many Requests (rate limit)

```powershell
# Reset rate limit keys trong Redis
docker exec servicehub-redis redis-cli -a 123456789 --no-auth-warning KEYS "throttle:*"
# Xóa từng key hoặc flush
docker exec servicehub-redis redis-cli -a 123456789 --no-auth-warning FLUSHDB
```

### Identity Service crash loop

```powershell
docker logs servicehub-identity-service --tail 30
# Thường do: DB connection failed hoặc compile error
```

### Python AI server không kết nối được từ Docker

Kiểm tra `.env` có dòng:
```
EKYC_AI_SERVICE_URL=http://host.docker.internal:8000
```

### Docker containers exit 137 (OOM)

Tăng memory Docker Desktop lên 8GB:
Docker Desktop → Settings → Resources → Memory: 8192 MB

### Rebuild sau khi thay đổi code

```powershell
# Rebuild 1 service cụ thể
docker compose build identity-service
docker compose up -d identity-service --force-recreate

# Rebuild tất cả
docker compose build
docker compose up -d
```

---

*Cập nhật: Tháng 10/2026*
