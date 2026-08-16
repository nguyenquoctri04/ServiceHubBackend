# Kế Hoạch Triển Khai Phase 4: Contract Service (Provider)

Kế hoạch này nhắm tới việc xây dựng luồng thương lượng và quản lý Hợp đồng dành cho Nhà cung cấp (Provider). Bản kế hoạch tập trung vào tính năng cốt lõi dựa trên schema hiện tại.

## User Review Required & Open Questions

> [!IMPORTANT]
> **Giải pháp tạm thời cho Ownership Check (Cross-tenant leak)**
> Vì logic sở hữu "Customer ↔ Provider" chưa chốt (chờ hệ thống Booking/Lease), tôi đề xuất **Fail-open (Tạm cho phép)** ở Phase 4: 
> - Vẫn gọi RPC `get.customer.by.id` để đảm bảo `customerId` có tồn tại và đang `ACTIVE`.
> - Tạm thời chưa chặn quyền tạo (Provider nào cũng có thể tạo nếu biết ID). 
> - Cắm sẵn TODO comment: Khi có hệ thống Booking, ta sẽ bổ sung gọi RPC check liên kết `roomId` & `customerId`.

---

## Proposed Changes

### 1. API Gateway (`apps/api-gateway`)

#### [NEW] `apps/api-gateway/src/provider/dto/contract.dto.ts`
- `CreateContractDto` (`templateId`, `customerId`, `services`, `termIds`, `variableValues`).
- `UpdateContractDto` (Tương tự Create).
- `ContractActionDto`: Nhận `{ "reason": "..." }` dùng chung cho các hành động Revoke, Cancel, Terminate (dùng cho việc xử lý log nghiệp vụ sau này nếu cần).
- `ContractQueryDto`.

#### [MODIFY] `apps/api-gateway/src/provider/provider.controller.ts`
- **Nhóm Template & Terms (Read-only cho form)**:
  - `GET /api/provider/contract-templates`
  - `GET /api/provider/contract-templates/:id`
  - `GET /api/provider/contract-terms`
- **Nhóm Hợp đồng (Quản lý)**:
  - `GET /api/provider/contracts`
  - `POST /api/provider/contracts`
  - `PUT /api/provider/contracts/:id`
  - `POST /api/provider/contracts/:id/send`
  - `POST /api/provider/contracts/:id/revoke`
  - `POST /api/provider/contracts/:id/cancel`
  - `POST /api/provider/contracts/:id/terminate`

---

### 2. Contract Service (`apps/contract-service`)

#### [NEW] `apps/contract-service/src/contracts/provider.contracts.controller.ts` & `.service.ts`
- **Logic Hợp Đồng (Create/Update)**:
  - Sinh mã `contractNumber` an toàn với format `{prefix}-{timestamp}-{random}`. (Bắt lỗi Unique `P2002` retry).
- **Đổi Trạng Thái**:
  - Mọi thao tác đổi trạng thái (Send, Revoke, Cancel, Terminate) đều cập nhật `status` trên bảng `Contract`.
  - Nếu chuyển từ `PENDING_SIGNATURE` về `DRAFT` (Revoke), đảm bảo reset các cờ liên quan (nếu có).
  - Publish Domain Event (`ContractCreated`, `ContractSubmitted`, v.v.).
- **Resilience**: Bọc RPC Call bằng `.pipe(timeout(5000), retry({count: 3, delay: 500}))`.

---

### 3. RPC Validators (Identity & Catalog Service)

- **Identity Service**: Cung cấp `@MessagePattern({ cmd: 'get.customer.by.id' })`.
- **Catalog Service**: Cung cấp `@MessagePattern({ cmd: 'get.service.price.by.id' })`.

---

## Verification Plan

### Automated Tests
- Chạy `npm run build` và `npm run lint`.

### Manual Verification
1. Gọi API `POST /api/provider/contracts`, kiểm tra DB xem Contract có được tạo thành công không.
2. Gọi các API thao tác trạng thái (Send, Revoke, Cancel, Terminate) và xác minh `status` được cập nhật chính xác trong cơ sở dữ liệu.
