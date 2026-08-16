# Kế Hoạch Triển Khai Backend (v2): API Phân Hệ Nhà Cung Cấp (Provider)

Tài liệu này là bản đặc tả API và Business Logic Backend, được ánh xạ 1-1 với giao diện Frontend (`provider_frontend_plan_v2.md`) nhằm đảm bảo tính đồng bộ hoàn toàn giữa FE và BE.

## Tóm Tắt Định Hướng (Out of Scope)
Các API/Chức năng sau sẽ **KHÔNG** được phát triển trong phạm vi hiện tại (tập trung cốt lõi vào Provider setup):
- ❌ API Quản lý Đơn hàng (Order Management). Việc thi công/cung cấp dịch vụ diễn ra ngoài hệ thống.
- ❌ API Ký hợp đồng số (Digital Signature). Tạm hoãn luồng ký kết sang phase sau.
- ❌ API Đối soát doanh thu (Revenues).
- ❌ API Đánh giá từ khách hàng (Reviews).
- ❌ API Yêu cầu hỗ trợ từ khách hàng (Customer Requests).

> **Chuẩn Phân trang (Pagination), Tìm kiếm (Search) & Lọc (Filtering)**: 
> Trách nhiệm xử lý phân trang, tìm kiếm và lọc dữ liệu **thuộc về Backend**. Tất cả các API `GET` lấy danh sách (Hợp đồng, Dịch vụ, Hóa đơn, Công tơ...) đều phải hỗ trợ bộ query parameters chuẩn: `?page=1&limit=20&sortBy=createdAt:desc&search=...&status=...`. FE chỉ việc truyền tham số lên.

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
      "address": "Quận 7",
      "confirm_distance_warning": true,
      "prices": [
        {
          "tierName": "Tiêu chuẩn",
          "price": 150000,
          "unit": "Máy"
        }
      ]
    }
    ```
  - **Logic**: 
    1. Gọi `DistanceMatrix.ai Geocoding Fast` để chuyển `address` ra tọa độ `latitude`, `longitude`.
    2. Nếu provider là `EXTERNAL_SERVICE`: Tìm Property `ACTIVE` gần nhất toàn hệ thống. Tính khoảng cách đường đi bằng `DistanceMatrix.ai Distance Matrix Fast`.
    3. Nếu > 5km và `confirm_distance_warning` = false -> Trả về object chứa `distance_check` (không lưu warning vào db) để FE tự render cảnh báo, và KHÔNG lưu Service.
    4. Nếu khoảng cách hợp lệ (hoặc FE đã confirm cảnh báo): Backend sử dụng Prisma Transaction để lưu `Service` (với `latitude`, `longitude` vừa tìm được, không có các cột tracking khoảng cách) và tạo Price.

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
  - Đẩy trạng thái sang `PENDING_SIGNATURE` (Chốt nội dung và gửi khách). *Lưu ý: Các API tiếp theo để ký số sẽ tạm hoãn.*
- **`POST /api/provider/contracts/:id/revoke`**
  - Thu hồi từ `PENDING_SIGNATURE` về `DRAFT` để sửa nội dung.
- **`POST /api/provider/contracts/:id/cancel`**
  - Hủy bỏ hợp đồng hoàn toàn.

---

## 4. Module Hóa Đơn & Thanh Toán Thủ Công (Manual Payment)
Cung cấp API cho phép Provider tự đánh dấu hóa đơn đã thanh toán (bằng Tiền mặt/Chuyển khoản tay).

### API Design
- **`POST /api/provider/billing/invoices/:id/pay`**
  - **Header bắt buộc**: `Idempotency-Key` (UUID do Client sinh ra để tránh duplicate payment nếu timeout/retry).
  - **Payload**:
    ```json
    {
      "paymentMethod": "CASH",
      "note": "Khách chuyển khoản trực tiếp"
    }
    ```
  - **Logic**:
    1. Kiểm tra Idempotency và trạng thái (`status == PAID` -> No-op / Trả về lỗi).
    2. Tạo bản ghi `Payment` với status `SUCCESS`, method `CASH`.
    3. Cập nhật `Invoice.status = PAID`.
    4. Ghi log sự kiện vào `AuditLog`.

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

---

## 7. Lộ Trình Triển Khai Backend (Implementation Phases)

Để đảm bảo các service nền tảng có đủ dữ liệu trước khi các service cấp cao hơn gọi sang (RPC), hệ thống sẽ được lập trình theo thứ tự sau. **Toàn bộ lộ trình này CHỈ phục vụ riêng cho đối tượng Provider**.

### Phase 1: Nền tảng & Cấu trúc chung (Foundation)
- **Shared Libs (`libs/common`)**: 
  - Tạo `ResponseInterceptor` để chuẩn hóa payload trả về.
  - Xây dựng Exception Filters chung bắt `RpcException` và chuyển thành `HttpException` tại Gateway.
  - Định nghĩa Pagination DTOs.
- **Redis Config**: Thiết lập cấu hình `ClientsModule` để các service kết nối `REDIS_BROKER_URL` với cơ chế timeout & retry.

### Phase 2: Identity Service (Quản lý Profile & RPC Provider)
- **REST APIs**: `GET /api/provider/profile` và `PUT /api/provider/profile` (lưu trữ thông tin và hồ sơ pháp lý).
- **RPC Endpoints**: `@MessagePattern({ cmd: 'get.provider.by.id' })` để phục vụ validation chéo từ Catalog và Contract Service.

### Phase 3: Catalog Service (Tạo Dịch vụ & Cảnh báo Khoảng cách)
- **Kiến trúc Module Location**: Xây dựng module `location` với pattern Strategy (`LocationService` gọi interface `GeocodingProvider` và `DistanceProvider`, implementation là `DistanceMatrixProvider`). Đảm bảo ProviderService không gọi trực tiếp third-party API.
- **REST APIs**: 
  - `GET /api/provider/catalog/services` (Lấy danh sách dịch vụ, hỗ trợ phân trang & lọc).
  - `POST /api/provider/catalog/services` (Tạo Dịch vụ kèm Bảng giá).
- **Distance Logic**: Xác định `provider_type`. Nếu là `EXTERNAL_SERVICE`, Geocode địa chỉ (qua `GEOCODING_FAST_API_KEY`) -> Tìm Nearest `ACTIVE` Property toàn hệ thống -> Trả kết quả khoảng cách qua `DISTANCE_MATRIX_FAST_API_KEY`. Trả warning object về FE nếu > 5km (không lưu vào DB).
- **RPC Endpoints**: Khởi tạo `@MessagePattern({ cmd: 'get.service.by.id' })`.

### Phase 4: Contract Service (Thương lượng Hợp đồng)
- **REST APIs**: 
  - `GET /api/provider/contracts` (Lấy danh sách hợp đồng, hỗ trợ phân trang & lọc theo status).
  - `POST /api/provider/contracts` (Tạo DRAFT và Deep Copy / Snapshot dữ liệu Template + Provider + Customer + Service).
  - `PUT /api/provider/contracts/:id` (Sửa nội dung DRAFT).
  - Các lệnh chuyển trạng thái: `send` (gửi khách), `revoke` (thu hồi).
- **Cross-Service Logic**: Gọi RPC sang Identity và Catalog để xác minh ID.

### Phase 5: Billing Service (Gạch nợ & Chốt số OCR)
- **Kiến trúc Module OCR**: Xây dựng module `ocr` theo pattern Strategy (`OcrService` -> `OcrProvider` interface -> `OcrSpaceProvider`). Sử dụng `OCR_SPACE_API_KEY` ở backend.
- **REST APIs**:
  - `GET /api/provider/billing/invoices`: Lấy danh sách hóa đơn (phân trang, lọc theo `UNPAID`/`PAID`).
  - `POST /api/provider/billing/invoices/:id/pay`: Gạch nợ thủ công bằng tiền mặt, lưu ý bắt buộc có `Idempotency-Key`.
  - `GET /api/provider/billing/meters`: Lấy danh sách chỉ số điện/nước.
  - `POST /api/provider/billing/meters/ocr`: API để Provider upload ảnh công tơ -> Trả kết quả OCR (nháp).
  - `POST /api/provider/billing/meters/ocr-confirm`: Tạo `MeterReading` từ giá trị user xác nhận. Nguồn: `IMAGE`.
