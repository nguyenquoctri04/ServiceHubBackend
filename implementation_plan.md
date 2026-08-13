# Kế Hoạch Triển Khai Phase 4: Contract Service (Provider)

Kế hoạch này nhắm tới việc xây dựng luồng thương lượng và quản lý Hợp đồng dành cho Nhà cung cấp (Provider). Bản V6 này đã chắt lọc và hợp nhất các thiết kế tối ưu từ bản kế hoạch cũ (Optimistic Locking, Audit Trail, Payload Revoke/Cancel) để đảm bảo độ tin cậy cấp độ doanh nghiệp.

## User Review Required & Open Questions

> [!IMPORTANT]
> **Giải pháp tạm thời cho Ownership Check (Cross-tenant leak)**
> Vì logic sở hữu "Customer ↔ Provider" chưa chốt (chờ hệ thống Booking/Lease), tôi đề xuất **Fail-open (Tạm cho phép)** ở Phase 4: 
> - Vẫn gọi RPC `get.customer.by.id` để đảm bảo `customerId` có tồn tại và đang `ACTIVE`.
> - Tạm thời chưa chặn quyền tạo (Provider nào cũng có thể tạo nếu biết ID). 
> - Cắm sẵn TODO comment: Khi có hệ thống Booking, ta sẽ bổ sung gọi RPC check liên kết `roomId` & `customerId`.

---

## Proposed Changes

### 1. Database Schema (`apps/contract-service/prisma/schema.prisma`)
Cập nhật schema để hỗ trợ Snapshot Pattern, Audit Trail (Lưu vết lịch sử) và Concurrency Control (Chống ghi đè đồng thời).

#### [MODIFY] `schema.prisma`
- **Bảng `Contract`**: 
  - Thêm `snapshotData Json? @map("snapshot_data")`. Lưu cục bộ mọi dữ liệu (Provider, Customer, Services, Values, `renderedContent` HTML).
  - Thêm `version Int @default(1)`: Phục vụ **Optimistic Locking** khi cập nhật DRAFT.
  - Thêm `cancelReason String? @map("cancel_reason")`: Lưu lý do hủy/thu hồi mới nhất.
- **Bảng `TemplateVariable`**:
  - Bổ sung `isSystemVariable Boolean @default(false) @map("is_system_variable")` để phân loại tự động điền hay Provider tự nhập tay. (Giữ `groupName` thuần túy cho UI Render).
- **[NEW] Bảng `ContractStatusHistory` (Audit Trail)**:
  - Lưu vết mọi lịch sử đổi trạng thái (Từ DRAFT sang PENDING_SIGNATURE, hay REVOKE, CANCEL).
  - Các cột: `id`, `contractId`, `statusFrom`, `statusTo`, `changedBy` (Identity UUID), `reason`, `createdAt`.

---

### 2. API Gateway (`apps/api-gateway`)

#### [NEW] `apps/api-gateway/src/provider/dto/contract.dto.ts`
- `CreateContractDto` (`templateId`, `customerId`, `services`, `termIds`, `variableValues`).
- `UpdateContractDto` (Tương tự Create, nhưng có thêm `version` để truyền lên check Optimistic Locking).
- `ContractActionDto`: Nhận `{ "reason": "..." }` dùng chung cho các hành động Revoke, Cancel, Terminate.
- `ContractQueryDto`.

#### [MODIFY] `apps/api-gateway/src/provider/provider.controller.ts`
- **Nhóm Template & Terms (Read-only cho form)**:
  - `GET /api/provider/contract-templates`
  - `GET /api/provider/contract-templates/:id` (Kèm Variables và `isSystemVariable`).
  - `GET /api/provider/contract-terms`
- **Nhóm Hợp đồng (Quản lý)**:
  - `GET /api/provider/contracts`
  - `POST /api/provider/contracts`
  - `PUT /api/provider/contracts/:id`
  - `POST /api/provider/contracts/:id/send`
  - `POST /api/provider/contracts/:id/revoke` (Payload: `{ "reason": "Sai thông tin" }`)
  - `POST /api/provider/contracts/:id/cancel` (Payload: `{ "reason": "Khách không thuê nữa" }`)
  - `POST /api/provider/contracts/:id/terminate`

---

### 3. Contract Service (`apps/contract-service`)

#### [NEW] `apps/contract-service/src/contracts/provider.contracts.controller.ts` & `.service.ts`
- **Logic Hợp Đồng (Create/Update)**:
  - Sinh mã `contractNumber` an toàn với format `{prefix}-{timestamp}-{random}`. (Bắt lỗi Unique `P2002` retry).
  - **Optimistic Locking**: Khi `contracts.update`, truy vấn `version: currentVersion` và `status: DRAFT`. Tự động tăng `version: { increment: 1 }`. Nếu văng lỗi (do ai đó đã sửa trước) -> Trả về 409 Conflict.
  - Build `snapshotData` gộp từ RPC Data (System) và DTO Data (User Input), render ra HTML.
- **Đổi Trạng Thái & Audit Trail**:
  - Mọi thao tác đổi trạng thái (Send, Revoke, Cancel, Terminate) đều dùng DB Transaction để: (1) Đổi status trên Contract (2) Lưu lý do vào `cancelReason` (3) Insert 1 dòng vào `ContractStatusHistory`.
  - Nếu chuyển từ `PENDING_SIGNATURE` về `DRAFT` (Revoke), đảm bảo reset các cờ liên quan (nếu có).
  - Publish Domain Event (`ContractCreated`, `ContractSubmitted`, v.v.).
- **Resilience**: Bọc RPC Call bằng `.pipe(timeout(5000), retry({count: 3, delay: 500}))`.

---

### 4. RPC Validators (Identity & Catalog Service)

- **Identity Service**: Cung cấp `@MessagePattern({ cmd: 'get.customer.by.id' })`.
- **Catalog Service**: Cung cấp `@MessagePattern({ cmd: 'get.service.price.by.id' })`.

---

## Verification Plan

### Automated Tests
- Chạy `npm run build` và `npm run lint`.
- **Đặc biệt (Optional nếu có time)**: Viết Unit Tests cho `contracts.service.spec.ts` chú trọng đặc biệt vào luồng **Optimistic Locking** (Mô phỏng 2 request update đồng thời).

### Manual Verification
1. Gọi API `POST /api/provider/contracts`, check DB có `ContractStatusHistory` được insert lúc tạo mới không.
2. Gọi API `PUT` với `version` cũ để test xem Optimistic Locking có ném lỗi 409 Conflict thành công không.
3. Test thao tác Revoke/Cancel xem có ghi nhận đúng `reason` vào DB.
