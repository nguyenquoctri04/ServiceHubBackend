# Kế Hoạch Triển Khai: Phân Hệ Nhà Cung Cấp (Provider)

Dựa trên bản thiết kế cơ sở dữ liệu (`db.txt`), tài liệu ngữ cảnh của hệ thống, và các quyết định kiến trúc vi dịch vụ (Microservices), bản kế hoạch này tập trung vào việc xây dựng các chức năng dành cho **Provider** (Chủ trọ / Ban quản lý chung cư / Dịch vụ lẻ).

---

## 1. Provider Model & Authorization Matrix

Giữ nguyên thiết kế 2 loại Provider, việc mở rộng loại hình dịch vụ sẽ được giải quyết qua `ServiceCategory` (Internet, Điện, Nước...) chứ không phải phình to enum `ProviderType`.

| Feature / Quyền | `PROPERTY_MANAGER` (Chủ trọ / BQL / Chủ tòa nhà) | `EXTERNAL_SERVICE` (Dịch vụ ngoài) |
| --- | --- | --- |
| Property / Block / Floor | ✅ Được phép | ❌ Không |
| Room | ✅ Được phép | ❌ Không |
| Customer | Theo Property quản lý | Theo Service cung cấp |
| Contract | ✅ Được phép | ✅ Được phép |
| Services / Prices | ✅ Được phép | ✅ Được phép |
| Meter Reading | ✅ Được phép | Tùy vào loại Service nếu có |
| Dashboard | ✅ Được phép | ✅ Được phép |

---

## 2. Geocoding & Distance Warning (Dành riêng cho EXTERNAL_SERVICE)

- **Nguyên tắc**: Distance Warning **không** áp dụng khi tạo Provider (Company). Nó **chỉ áp dụng khi tạo Service** mới thuộc loại `EXTERNAL_SERVICE`.
- **Tìm kiếm toàn hệ thống**: Khi tạo dịch vụ ngoài, hệ thống sẽ tìm Property (Bất động sản) gần nhất trong **TOÀN BỘ HỆ THỐNG** (bất kể thuộc Provider nào), có trạng thái `ACTIVE`.
- **Luồng xử lý tạo Service**:
  1. Kiểm tra `provider_type` (từ Identity Service).
  2. Nếu là `PROPERTY_MANAGER`: Bỏ qua tính khoảng cách.
  3. Nếu là `EXTERNAL_SERVICE`:
     - Gọi `DistanceMatrix.ai Geocoding Fast` chuyển địa chỉ Service ra Lat/Lng.
     - Tìm Nearest ACTIVE Property (truy vấn toàn hệ thống).
     - Gọi `DistanceMatrix.ai Distance Matrix Fast` để tính khoảng cách đường đi (route distance) thay vì Haversine.
     - Nếu khoảng cách > 5km: Trả về Warning trong API response (`warning: true, distance_km: 6.2`).
- **Không lưu Warning vào DB**: API chỉ trả về object chứa cảnh báo để Frontend hiển thị popup. Không bổ sung các cột `distance_warning`, `nearest_property_id` vào bảng `Service`. Dữ liệu khoảng cách chỉ được tính ở thời điểm tạo để tư vấn/cảnh báo.

---

## 3. Aggregator Pattern (BFF)

Giữ nguyên nguyên tắc Database-per-Service. Tuyệt đối không Join DB chéo.
- API Gateway hoạt động như Backend-For-Frontend (BFF).
- Ví dụ: `GET /provider/customers`
  - Gateway -> `customer-service`, `contract-service`, `provider-service` -> Merge -> Mapping -> Filtering -> Sorting -> Pagination -> Trả về Frontend.
- Gateway chỉ làm nhiệm vụ Aggregate, Compose, Transform; KHÔNG chứa Business Logic.

---

## 4. Contract Design & Workflow (Trọng tâm)

Hợp đồng không chỉ là một file tài liệu, nó là một **Agreement Workflow**.

### Hệ Thống Template Dựng Sẵn (Pre-built Templates)
- **Data Seed 100%**: Hệ thống cung cấp sẵn các mẫu hợp đồng (Templates) và điều khoản chuẩn theo quy định của pháp luật thông qua Seed Data.
- **Lưu ý quan trọng**: Provider **không thể tự tạo hay custom template** riêng. Provider chỉ có thể sử dụng các template do hệ thống cung cấp sẵn.

### Snapshot Pattern Toàn Diện
Khi tạo một Contract từ Template, hệ thống sẽ **Deep Copy** không chỉ Template mà còn Snapshot luôn thông tin tại thời điểm đó của:
- `Template` (`templateId`, nội dung JSON).
- `Provider`, `Customer`, `Service` (bao gồm `Room` nếu là dịch vụ thuê phòng), `Price`.

### State Machine & Workflow Đàm Phán
Do luồng Ký Hợp Đồng (Signature) được **tạm hoãn (out of scope ở giai đoạn này)**, State Machine của Hợp đồng sẽ tập trung vào việc tạo nháp và chốt nội dung:

**Bảng State-Transition:**
| Từ Trạng thái | Hành động (Trigger) | Sang Trạng thái | Role được phép |
| ------------- | -------------------- | ---------------- | -------------- |
| `DRAFT` | `submit` (Chốt nội dung) | `PENDING_SIGNATURE` | Provider |
| `PENDING_SIGNATURE` | `revoke` (Thu hồi để sửa) | `DRAFT` | Provider |
| `PENDING_SIGNATURE` | `cancel` (Hủy bỏ) | `CANCELLED` | Provider |
| `ACTIVE` | `terminate` (Chấm dứt) | `TERMINATED` | Provider |

*Ghi chú: Việc chuyển từ `PENDING_SIGNATURE` sang `ACTIVE` sẽ do API ký kết (tạm hoãn) đảm nhận trong tương lai.*

---

## 5. Signature Service Integration

> **Tạm hoãn (Out of Scope)**: Luồng ký hợp đồng số (Digital Signature) và các API gọi sang Signature Service sẽ không được triển khai ở giai đoạn này. Sẽ có API ký hợp đồng bổ sung ở các phase sau.

---

## 6. API Design (Business Oriented)

> **Source of Truth**: Chi tiết toàn bộ API của phân hệ Provider được quy định chuẩn thức tại tài liệu `provider_backend_plan_v2.md`. Vui lòng tham khảo tài liệu đó, phần này không lưu thông tin thừa để tránh mâu thuẫn.

---

## 7. OCR Flow (Đề xuất & Xác nhận Chỉ số)

OCR chỉ là công cụ đề xuất, quyết định cuối cùng và xác nhận nằm ở người dùng. **Không tạo bảng trung gian riêng cho kết quả OCR**.
**Luồng xử lý (2 bước độc lập):** 
1. **Phân tích ảnh**: Provider Upload Image -> Backend gọi **OCR.Space** (Engine 2, eng) qua abstraction layer (`OcrService` -> `OcrProvider`) -> Trả kết quả (`Detected Value`) về Frontend. Mọi cấu hình API key chỉ lưu tại backend (ẩn hoàn toàn với FE).
2. **Review & Lưu**: Frontend hiển thị ảnh gốc cạnh kết quả OCR (kèm cảnh báo kiểm tra). Provider sửa tay nếu cần -> Bấm **Confirm**.
3. **Lưu Database**: Backend nhận kết quả chốt, tạo ngay bản ghi `MeterReading` với:
   - `source = IMAGE`
   - `value = [giá trị user xác nhận]`
   - `img_url = [link ảnh]`
   - `status = VALID`
   - `recorded_by = provider`

---

## 8. Bất động sản (Property) là một Dịch vụ

Bất động sản (Cho thuê nhà/phòng) được xem là một loại **Service đặc thù**. Mọi thông tin liên quan đến quản lý bất động sản chỉ là dữ liệu đi kèm để phục vụ cho Service đó. 
- Dữ liệu này thuộc quản lý của `catalog-service`.
- Cấu trúc đồng nhất: `Property` -> `Block` (Tòa nhà) -> `Floor` (Tầng) -> `Room` (Phòng).

---

## 9. Event Catalog (Redis Pub/Sub)

Định nghĩa rõ ràng các Event lưu thông giữa các Microservices:
- `ContractCreated`, `ContractSubmitted`, `ContractActivated`
- `ProviderVerified`
- `MeterReadingConfirmed`
- `PropertyCreated`
- `CustomerAssigned`, `CustomerRemoved`
*(Mỗi Event cần đặc tả: Publisher, Subscriber, Payload).*
