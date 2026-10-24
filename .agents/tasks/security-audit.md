# Security Audit Report — ServiceHubBackend
**Date:** 2024-10 | **Scope:** API Gateway + HMAC coverage + SecureRpc + DTO + Ports + Rate limiting

---

## Executive Summary

Hệ thống **về cơ bản đã áp dụng đúng** mô hình bảo mật đã thiết kế:
- Tất cả 7 microservice đều có `HmacGuard` qua `useGlobalGuards`.
- Mọi RPC call từ Gateway đều đi qua `SecureRpcService` hoặc `GatewayProxyService` (wrapper của SecureRpc) — **không có bypass trực tiếp**.
- `ThrottlerGuard` áp toàn cục trên API Gateway.
- `compose.yml` chỉ expose port 3000 (api-gateway).

Tuy nhiên có **3 vấn đề thực sự** và **2 vấn đề nhỏ** cần xử lý:

| # | Mức độ | Vấn đề |
|---|--------|--------|
| 1 | ⚠️ MEDIUM | `auth/logout` và `auth/refresh` public (không có `JwtAuthGuard`) — cần xem xét |
| 2 | ⚠️ MEDIUM | `CustomerCategoriesController` (`GET /home`, `GET /`) public — không cần token — cần đánh giá có đúng ý định không |
| 3 | ⚠️ MEDIUM | `CustomerServicesController` dùng `OptionalJwtAuthGuard` thay `JwtAuthGuard` — user chưa đăng nhập vẫn truy cập được |
| 4 | 🔴 HIGH | 10 controller "stub" không có route nào — nhưng controller đã được đăng ký, nghĩa là `@Controller(path)` chiếm prefix mà không có route thực |
| 5 | ℹ️ INFO | `SubmitEkycDto` dùng `@Allow()` đúng cách, hoạt động bình thường với `whitelist: true` |

---

## 1. API Gateway Coverage (JwtAuthGuard)

### ✅ Routes được bảo vệ đúng

| Controller | Guard | Ghi chú |
|-----------|-------|---------|
| `ProviderController` (`api/provider/**`) | `@UseGuards(JwtAuthGuard, RolesGuard)` ở class-level | **Tất cả** route trong class đều được bảo vệ, thêm `@Roles('PROVIDER')` |
| `CustomerContractsController` | `@UseGuards(JwtAuthGuard)` ở từng method | `createServiceBooking`, `getUsedServices`, `viewContract` — đúng |
| `CustomerViolationsController` | `@UseGuards(JwtAuthGuard)` ở method | `GET /violations` — đúng |
| `CustomerKeysController` | `@UseGuards(JwtAuthGuard)` ở method | `POST /keys` — đúng |
| `CustomerSignaturesController` | `@UseGuards(JwtAuthGuard)` ở method | `POST /signatures/sign` — đúng |
| `CustomerIdentitiesController.getCustomerInformation` | `@UseGuards(JwtAuthGuard)` ở method | Đúng |
| `AuthController.switchProfile` | `@UseGuards(JwtAuthGuard)` | Đúng |
| `AuthController.me` | `@UseGuards(JwtAuthGuard)` | Đúng |

### ⚠️ Routes PUBLIC (không có guard hoặc dùng Optional)

#### `AuthController` — `apps/api-gateway/src/auth/auth.controller.ts`

| Route | Guard | Đánh giá |
|-------|-------|----------|
| `POST /api/auth/register` | `AuthThrottleGuard` only | ✅ Đúng — public theo thiết kế |
| `POST /api/auth/login` | `AuthThrottleGuard` only | ✅ Đúng — public theo thiết kế |
| `POST /api/auth/refresh` | **Không có guard** | ⚠️ Semi-risk: dùng refresh token từ cookie — không có rate limit riêng cho route này |
| `POST /api/auth/logout` | **Không có guard** | ℹ️ Acceptable — logout cần public để xử lý token đã hết hạn |

**Vấn đề:** `POST /api/auth/refresh` không có `AuthThrottleGuard` nhưng vẫn bị chặn bởi `ThrottlerGuard` toàn cục (100 req/phút). Tuy nhiên không có rate limit riêng chặt hơn cho route này — kẻ tấn công có thể brute-force refresh token.

#### `CustomerCategoriesController` — `apps/api-gateway/src/customer/catalog/categories/categories.controller.ts`

| Route | Guard | Đánh giá |
|-------|-------|----------|
| `GET /api/customer/catalog/categories/home` | **Không có guard** | ⚠️ Public hoàn toàn — đây có thể là ý định (trang home) |
| `GET /api/customer/catalog/categories` | **Không có guard** | ⚠️ Public hoàn toàn |

**Lưu ý:** Hai route này gọi `catalog-service` qua `SecureRpcService` (HMAC vẫn có), chỉ là không yêu cầu JWT. Nếu đây là "marketplace public" thì đúng thiết kế. Nếu cần đăng nhập để xem thì cần thêm guard.

#### `CustomerServicesController` — `apps/api-gateway/src/customer/catalog/services/services.controller.ts`

| Route | Guard | Đánh giá |
|-------|-------|----------|
| `GET /` (getServices) | `OptionalJwtAuthGuard` | ⚠️ Cho phép user chưa đăng nhập |
| `GET /categories` | **Không có guard** | ⚠️ Hoàn toàn public |
| `GET /detail/:id` | `OptionalJwtAuthGuard` | ⚠️ Cho phép user chưa đăng nhập |
| `GET /detail/:id/relate` | `OptionalJwtAuthGuard` | ⚠️ Cho phép user chưa đăng nhập |

**Lưu ý:** `OptionalJwtAuthGuard` không throw lỗi khi thiếu token (`handleRequest` return `null`). Nếu đây là marketplace public browsing thì đúng. Nếu cần đăng nhập thì cần đổi sang `JwtAuthGuard`.

#### `CustomerIdentitiesController.getProviderDetail`

```
GET /api/customer/identity/:id  →  OptionalJwtAuthGuard
```
Cho phép xem profile provider khi chưa đăng nhập. Có vẻ đúng thiết kế (public provider listing).

---

## 2. HMAC Coverage (HmacGuard trên Microservices)

### Kết quả: ✅ TẤT CẢ microservice đều có HmacGuard

Từng `main.ts` đều có dòng:
```typescript
app.useGlobalGuards(app.get(HmacGuard));
```

| Service | File | Status |
|---------|------|--------|
| identity-service | `apps/identity-service/src/main.ts:15` | ✅ |
| catalog-service | `apps/catalog-service/src/main.ts:15` | ✅ |
| contract-service | `apps/contract-service/src/main.ts:15` | ✅ |
| signature-service | `apps/signature-service/src/main.ts:15` | ✅ |
| billing-service | `apps/billing-service/src/main.ts:15` | ✅ |
| notification-service | `apps/notification-service/src/main.ts:15` | ✅ |
| audit-service | `apps/audit-service/src/main.ts:15` | ✅ |

`HmacGuard` (`libs/common/src/guards/hmac.guard.ts`) hoạt động bằng cách:
1. Đọc `request.meta.service` để xác định service caller.
2. Tra cứu secret từ ENV tương ứng.
3. Gọi `HmacService.verifyRequest()` xác thực chữ ký.
4. Gọi `ReplayProtectionService.check(requestId)` chống replay attack.
5. Ghi đè `args[0] = request.data` để controller nhận DTO sạch.

---

## 3. SecureRpcService Usage (Không có Direct Bypass)

### Kết quả: ✅ KHÔNG có direct bypass

Scan toàn bộ `apps/api-gateway/src/**/*.ts` với pattern `this.\w+Client\.send(` — **không có match**.

Luồng gọi từ Gateway đến Microservice đi theo 2 con đường, đều có HMAC:

**Con đường 1 — ProviderController** (dùng `GatewayProxyService`):
```
ProviderController.proxy.send(client, pattern, data)
  → GatewayProxyService.send()
    → SecureRpcService.send()          // ✅ HMAC wrapped
      → client.send(pattern, request)  // request = { meta: {hmac, ...}, data }
```

**Con đường 2 — Customer Services** (dùng `SecureRpcService` trực tiếp):
```
CustomerXxxService.secureRpc.send(client, pattern, data)
  → SecureRpcService.send()            // ✅ HMAC wrapped
    → client.send(pattern, request)
```

**Con đường 3 — AuthService** (dùng `SecureRpcService` trực tiếp):
```
AuthService.secureRpc.send(identityClient, pattern, data)
  → SecureRpcService.send()            // ✅ HMAC wrapped
```

### ⚠️ Phát hiện: 10 Service stub không có implementation

Các service sau có controller và service file nhưng **không có route nào** — controller rỗng, service không gọi microservice:

| Controller | Service | Ghi chú |
|-----------|---------|---------|
| `CustomerInvoicesController` | `CustomerInvoicesService` | Stub rỗng |
| `CustomerPaymentsController` | `CustomerPaymentsService` | Stub rỗng |
| `CustomerAuditController` | `CustomerAuditService` | Stub rỗng |
| `CustomerNotificationController` | `CustomerNotificationService` | Stub rỗng |
| `CustomerUnitsController` | `CustomerUnitsService` | Stub rỗng |
| `CustomerTemplatesController` | `CustomerTemplatesService` | Stub rỗng |
| `CustomerTermsController` | `CustomerTermsService` | Stub rỗng |

**Nguy cơ bảo mật:** Thấp — các controller rỗng không có route nên không có attack surface. Tuy nhiên, khi implement sau này cần nhớ thêm guard, nếu không sẽ vô tình tạo public endpoint.

---

## 4. SubmitEkycDto — Compatibility với `whitelist: true`

### Kết quả: ✅ Đúng

`apps/identity-service/src/ekyc/dto/submit-ekyc.dto.ts`:
```typescript
export class SubmitEkycDto {
    @Allow() identityId: string;
    @Allow() frontImageBuffer: Buffer;
    @Allow() selfieImageBuffer: Buffer;
    @Allow() frontImageUrl?: string;
    @Allow() selfieImageUrl?: string;
}
```

Với `ValidationPipe({ whitelist: true })`:
- Các field **không có decorator** sẽ bị strip.
- `@Allow()` đánh dấu field là "được phép qua" mà không cần validate giá trị.
- `Buffer` không thể validate bằng `@IsString()` hay tương tự nên `@Allow()` là cách đúng.

Lưu ý: Sau khi `HmacGuard` strip envelope và ghi `args[0] = request.data`, `ValidationPipe` sẽ validate object `data` này — hoạt động bình thường.

---

## 5. Exposed Ports (compose.yml)

### Kết quả: ✅ Chỉ api-gateway expose port ra ngoài

```yaml
api-gateway:
  ports:
    - 3000:3000   # DUY NHẤT service expose ra ngoài
```

Tất cả microservice còn lại (`identity-service`, `catalog-service`, `contract-service`, `signature-service`, `billing-service`, `notification-service`, `audit-service`) **không có khai báo `ports:`** — chỉ giao tiếp nội bộ qua `servicehub-net` (Docker bridge network) và Redis.

Redis cũng không expose ra host — chỉ accessible trong `servicehub-net`.

---

## 6. Rate Limiting (ThrottlerGuard)

### Kết quả: ✅ Được áp dụng đúng, không có bypass không hợp lý

**`AppModule` (`apps/api-gateway/src/app.module.ts`):**
```typescript
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
}
```
`APP_GUARD` = global guard, áp cho **tất cả route** của api-gateway (100 req/60s per IP, từ env `RATE_LIMIT_LIMIT` và `RATE_LIMIT_TTL_SECONDS`).

**Auth routes** có thêm lớp riêng:
- `POST /auth/login` → `@UseGuards(AuthThrottleGuard)` (5 req/60s by default, block 300s)
- `POST /auth/register` → `@UseGuards(AuthThrottleGuard)` (5 req/60s)

**`POST /auth/refresh` không có `AuthThrottleGuard`** — chỉ có global ThrottlerGuard (100 req/60s). Đây là gap nhỏ so với login/register nhưng refresh dùng token từ HttpOnly cookie nên brute-force khó hơn.

Storage backend: Redis (`RedisThrottlerStorageService`) — đảm bảo rate limit hoạt động đúng trong môi trường multi-instance.

---

## Kết luận và Khuyến nghị

### Trả lời 6 câu hỏi audit:

1. **API Gateway coverage**: Phần lớn đúng. `ProviderController` bảo vệ class-level. Các customer controller bảo vệ method-level. **Gap nhỏ:** `auth/refresh` và `auth/logout` public (chấp nhận được), catalog/services dùng `OptionalJwtAuthGuard` (đúng nếu là marketplace public).

2. **HMAC coverage**: ✅ **TẤT CẢ 7 microservice** đều có `HmacGuard` qua `useGlobalGuards`.

3. **SecureRpcService usage**: ✅ **Không có bypass**. Mọi call đều qua `SecureRpcService.send()` hoặc `GatewayProxyService.send()` (wrapper của SecureRpc).

4. **SubmitEkycDto**: ✅ `@Allow()` hoạt động đúng với `whitelist: true`.

5. **Exposed ports**: ✅ Chỉ port 3000 (api-gateway) expose ra ngoài.

6. **Rate limiting**: ✅ `ThrottlerGuard` global áp đúng. Auth có `AuthThrottleGuard` riêng chặt hơn. **Gap nhỏ:** `auth/refresh` thiếu `AuthThrottleGuard`.

### Các fix nên làm (theo mức độ ưu tiên):

#### 🔴 Ưu tiên cao
Không có vấn đề critical — kiến trúc bảo mật cơ bản đúng.

#### ⚠️ Ưu tiên trung bình

**Fix 1:** Thêm `AuthThrottleGuard` cho `POST /auth/refresh`:
```typescript
// auth.controller.ts
@UseGuards(AuthThrottleGuard)
@Post('refresh')
async refresh(...) { ... }
```

**Fix 2:** Các stub controller rỗng khi implement phải nhớ thêm `@UseGuards(JwtAuthGuard)` — nên để comment placeholder để tránh quên.

#### ℹ️ Ưu tiên thấp / cần confirm

**Confirm:** Các route `OptionalJwtAuthGuard` và public (`GET /catalog/categories`, `GET /catalog/services`) — xác nhận đây là ý định thiết kế (public marketplace browsing). Nếu đúng thì không cần sửa.

---

*Report generated via static code analysis — READ ONLY, no code was modified.*
