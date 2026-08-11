# Kế Hoạch Triển Khai Backend (v2): API Phân Hệ Nhà Cung Cấp (Provider)

Tài liệu này là bản đặc tả API và Business Logic Backend, được ánh xạ 1-1 với giao diện Frontend (`provider_frontend_plan_v2.md`) nhằm đảm bảo tính đồng bộ hoàn toàn giữa FE và BE.

## Tóm Tắt Định Hướng (Out of Scope)
Các API sau sẽ **KHÔNG** được phát triển trong phạm vi đồ án này (để bám sát việc dọn dẹp ở Frontend):
- ❌ API Đối soát doanh thu (Revenues).
- ❌ API Đánh giá từ khách hàng (Reviews).
- ❌ API Yêu cầu hỗ trợ từ khách hàng (Customer Requests).

---

## 1. Module Catalog & Prices (Gộp API)
Do Frontend đã gộp Form tạo Dịch vụ và Giá thành một, Backend sẽ cung cấp API `POST /provider/catalog/services` hỗ trợ nhận toàn bộ data trong 1 transactional request (Tạo Service -> Tạo ServicePrice Tiers).

### API Design
- **`POST /api/provider/catalog/services`**
  - **Payload**:
    ```json
    {
      "name": "Vệ sinh máy lạnh",
      "categoryId": "uuid",
      "description": "...",
      "prices": [
        {
          "tierName": "Tiêu chuẩn",
          "price": 150000,
          "unit": "Máy"
        }
      ]
    }
    ```
  - **Logic**: Backend sử dụng Prisma Transaction để rollback nếu tạo Service thành công nhưng tạo Price thất bại.

---

## 2. Module Hợp Đồng (Contract Workflow)
Hợp đồng đã được đơn giản hóa thành 6 trạng thái cơ bản, loại bỏ các khái niệm Versioning, Comment và các trạng thái thừa (`UNDER_REVIEW`, `READY_TO_SIGN`).

### State Machine Áp Dụng
`DRAFT` → `PENDING_SIGNATURE` (Chờ chữ ký các bên) → `ACTIVE` → (`EXPIRED` | `TERMINATED` | `CANCELLED`)

### API Design
- **`POST /api/provider/contracts`**
  - Tạo hợp đồng nháp (`DRAFT`). Deep copy toàn bộ Template, Provider, Customer, Service, Price vào thời điểm tạo.
- **`PUT /api/provider/contracts/:id`**
  - Cập nhật hợp đồng (Chỉ áp dụng khi hợp đồng ở trạng thái `DRAFT` hoặc bị thu hồi về `DRAFT`). KHÔNG sinh Version mới, ghi đè trực tiếp.
- **`POST /api/provider/contracts/:id/send`**
  - Đẩy trạng thái sang `PENDING_SIGNATURE` (Đối với luồng yêu cầu chữ ký) hoặc `ACTIVE` (Đối với luồng không yêu cầu chữ ký - sau khi khách đồng ý).
- **`POST /api/provider/contracts/:id/revoke`**
  - Thu hồi từ `PENDING_SIGNATURE` về `DRAFT` để sửa nội dung. Các chữ ký đã ký (nếu có) bị reset.

---

## 3. Module Đơn Hàng (Order Management - Dành cho EXTERNAL_SERVICE)
Do `EXTERNAL_SERVICE` (như thợ sửa chữa lẻ) không sử dụng hợp đồng dài hạn, Backend (cụ thể là `order-service`) sẽ cung cấp các API quản lý Đơn đặt dịch vụ lẻ.

### API Design
- **`GET /api/provider/orders`**
  - Lấy danh sách đơn đặt dịch vụ của Provider hiện tại.
- **`PUT /api/provider/orders/:id/status`**
  - **Payload**: `{ "status": "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }`
  - Cập nhật trạng thái thi công của đơn dịch vụ lẻ.

---

## 4. Module Hóa Đơn & Thanh Toán Thủ Công (Manual Payment)
Cung cấp API cho phép Provider tự đánh dấu hóa đơn đã thanh toán (bằng Tiền mặt/Chuyển khoản tay).

### API Design
- **`POST /api/provider/billing/invoices/:id/pay`**
  - **Payload**:
    ```json
    {
      "paymentMethod": "CASH",
      "note": "Khách chuyển khoản trực tiếp"
    }
    ```
  - **Logic**:
    1. Tạo bản ghi `Payment` với status `SUCCESS`, method `CASH`.
    2. Cập nhật `Invoice.status = PAID`.
    3. Ghi log sự kiện vào `AuditLog` (Hành động đánh dấu thanh toán thủ công).

---

## 5. Module Hồ Sơ & Cài Đặt (Profile / Settings)
Frontend đã gộp chung Hồ sơ và Cài đặt, Backend sẽ phục vụ bằng một cấu trúc API duy nhất hoặc qua BFF (API Gateway) để lấy toàn bộ trong 1 lệnh gọi.

### API Design
- **`GET /api/provider/profile`**
  - Trả về thông tin cá nhân (Profile) + Giấy tờ pháp lý (Legal Documents) + Cài đặt hệ thống (System Settings - e.g., Cảnh báo khoảng cách).
- **`PUT /api/provider/profile`**
  - Cập nhật thông tin.

---

## 6. Vi Phạm & Khiếu Nại (Violations)
Việc khiếu nại (Dispute/Appeal) hai chiều tạm gác lại. Backend chỉ cần cung cấp API một chiều (Provider lập/xử lý vi phạm của Khách hàng). Trạng thái `DISPUTED` chưa áp dụng ở giai đoạn này.
