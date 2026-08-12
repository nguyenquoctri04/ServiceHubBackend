# Kế Hoạch Triển Khai Phase 4: Contract Service (Module Hợp Đồng)

Dựa trên thiết kế Frontend (`provider_frontend_plan_v2.md`), Backend Plan và các phản hồi thiết kế, dưới đây là kế hoạch thi công chi tiết cho Phase 4 đã được tinh chỉnh.

## 1. Cập Nhật Prisma Schema (`apps/contract-service/prisma/schema.prisma`)

Để đáp ứng chính xác lifecycle của Hợp đồng và đảm bảo an toàn pháp lý, tôi sẽ thực hiện các thay đổi schema sau:

### Bổ sung vào model `Contract`:
```prisma
  // 1. Quản lý Mẫu & Biến số
  templateId       String?        @map("template_id") @db.Uuid
  variables        Json?          // Lưu raw variables ngay từ lúc tạo DRAFT (VD: {"CUSTOMER_NAME": "Nguyễn Văn A"})
  
  // 2. Nội dung "Đóng băng" (Sinh ra khi chuyển sang PENDING_SIGNATURE)
  snapshotContent  String?        @map("snapshot_content") // Rendered Text/HTML của hợp đồng
  snapshotTerms    Json?          @map("snapshot_terms")   // Lưu cứng nội dung của các Term tại thời điểm gửi

  // 3. Quản lý Concurrency & Audit (Last-write-wins & Lịch sử)
  cancelReason     String?        @map("cancel_reason")
  version          Int            @default(1) // Phục vụ Optimistic Locking khi update DRAFT
```

### Bổ sung model `ContractStatusHistory` (Audit Trail):
```prisma
model ContractStatusHistory {
  id          String         @id @default(uuid()) @db.Uuid
  contractId  String         @map("contract_id") @db.Uuid
  statusFrom  ContractStatus? @map("status_from")
  statusTo    ContractStatus @map("status_to")
  changedBy   String         @map("changed_by") @db.Uuid // Người thực hiện (Provider/Khách)
  reason      String?        // Lý do đổi trạng thái (Nhất là Revoke/Cancel)
  createdAt   DateTime       @map("created_at")

  contract    Contract       @relation(fields: [contractId], references: [id])
  
  @@index([contractId])
  @@map("contract_status_history")
}
```

> **Lệnh Migration:** `npx prisma migrate dev --name add_contract_lifecycle_fields`

---

## 2. Các REST API (Tại API Gateway)

### 2.1. Nhóm API Hỗ Trợ Giao Diện Wizard (Bước 1, 2, 4)
- **`GET /api/provider/contracts/templates`**: Lấy danh sách Mẫu hợp đồng khả dụng.
- **`GET /api/provider/contracts/terms`**: Lấy danh sách Điều khoản (Terms) khả dụng.
- **Lưu ý Bước 2:** Search Customer và Service sẽ tái sử dụng lại các API hiện có: `GET /api/provider/customers` (Bắn RPC sang Identity) và `GET /api/provider/catalog/services` (Đã làm ở Phase 3).

### 2.2. Nhóm API CRUD Hợp Đồng (Bước 3 & Quản lý)
- **`GET /api/provider/contracts`**: Danh sách hợp đồng (Pagination, Search, Filter theo `status`).
- **`GET /api/provider/contracts/:id`**: Chi tiết 1 hợp đồng.
- **`POST /api/provider/contracts`**: Tạo mới DRAFT (Payload chứa `customerId`, `roomId`, `templateId`, `variables`, `termIds`, `services`).
- **`PUT /api/provider/contracts/:id`**: Cập nhật DRAFT.

### 2.3. Nhóm API Chuyển Trạng Thái (Action APIs)
- **`POST /api/provider/contracts/:id/send`**: Gửi khách ký (DRAFT -> PENDING_SIGNATURE).
- **`POST /api/provider/contracts/:id/revoke`**: Thu hồi (PENDING_SIGNATURE -> DRAFT). Payload: `{ "reason": "Sai thông tin" }`.
- **`POST /api/provider/contracts/:id/cancel`**: Hủy (-> CANCELLED). Payload: `{ "reason": "Khách không thuê nữa" }`.

---

## 3. Contract Service Logic (`contracts.service.ts`)

Thay vì gộp chung vào một Pattern, các thao tác sẽ được tách biệt rõ ràng:

### A. `contracts.create` & `contracts.update`
- **Validation liên kết `roomId` & `customerId`**: Gọi RPC sang Property/Identity Service để đảm bảo Khách hàng này thực sự đang thuê/liên kết với Phòng này (Tránh râu ông nọ cắm cằm bà kia).
- **Sinh `ContractNumber` an toàn (Tránh Race Condition):** Dùng format `CT-<YYYYMMDD>-<ShortUUID>` (VD: `CT-20260812-A1B2C3`). Dùng UUID cắt ngắn giúp tránh đụng độ 100% trong môi trường phân tán mà không cần khoá (lock) Database phức tạp.
- **Concurrency (Optimistic Locking):** Khi `contracts.update`, truy vấn kèm điều kiện `version: currentVersion` và `status: DRAFT`. Nếu cập nhật thành công, `version` tự động tăng lên 1 (`version: { increment: 1 }`). Nếu thất bại báo lỗi Conflict. (Xóa các relations cũ và insert relations mới trong cùng 1 Transaction).

### B. `contracts.send`
- **Đóng băng Dữ Liệu (Snapshotting):** 
  - Lấy `variables` hiện tại, kết hợp với nội dung của `ContractTemplate` để Generate ra Text/HTML hoàn chỉnh -> Lưu vào `snapshotContent`.
  - Lấy toàn bộ nội dung text của các `Term` liên kết -> Lưu cứng dạng JSON array vào `snapshotTerms`.
- **Đổi trạng thái:** Cập nhật `status = PENDING_SIGNATURE`.
- **Audit Trail:** Insert 1 record vào `ContractStatusHistory`.

### C. `contracts.revoke` & `contracts.cancel`
- **Revoke:** Đổi status từ `PENDING_SIGNATURE` về `DRAFT`. Xóa bỏ/Reset toàn bộ chữ ký đã ký trước đó (nếu có bảng quản lý chữ ký). Insert Audit Trail kèm lý do.
- **Cancel:** Đổi status về `CANCELLED`. Insert Audit Trail kèm lý do.

---

## 4. Kế Hoạch Kiểm Thử
- Viết Unit Tests cho Contract Service, chú trọng đặc biệt vào luồng **Optimistic Locking** (Mô phỏng 2 request update đồng thời).
- Kiểm tra tính toàn vẹn của dữ liệu Snapshot (Cập nhật Template gốc/Term gốc, đảm bảo Hợp đồng đã gửi không bị ảnh hưởng).
