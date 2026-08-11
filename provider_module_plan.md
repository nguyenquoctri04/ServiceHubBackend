# Kế Hoạch Triển Khai: Phân Hệ Nhà Cung Cấp (Provider)

Dựa trên bản thiết kế cơ sở dữ liệu (`db.txt`), tài liệu ngữ cảnh của hệ thống, và các quyết định kiến trúc vi dịch vụ (Microservices), bản kế hoạch này tập trung vào việc xây dựng các chức năng dành cho **Provider** (Chủ trọ / Ban quản lý chung cư / Dịch vụ lẻ).

---

## 1. Provider Model & Authorization Matrix

Giữ nguyên thiết kế 2 loại Provider, việc mở rộng loại hình dịch vụ sẽ được giải quyết qua `ServiceCategory` (Internet, Điện, Nước...) chứ không phải phình to enum `ProviderType`.

| Feature / Quyền | `LANDLORD` (Chủ trọ / BQL / Chủ tòa nhà) | `EXTERNAL_SERVICE` (Dịch vụ ngoài) |
| --- | --- | --- |
| Property / Block / Floor | ✅ Được phép | ❌ Không |
| Room | ✅ Được phép | ❌ Không |
| Customer | Theo Property quản lý | Theo Service cung cấp |
| Contract | ✅ Được phép | ✅ Được phép |
| Services / Prices | ✅ Được phép | ✅ Được phép |
| Meter Reading | ✅ Được phép | Tùy vào loại Service nếu có |
| Dashboard | ✅ Được phép | ✅ Được phép |

---

## 2. Geocoding & Recommendation

- **Geocoding**: Khi Provider đăng ký, dùng Mapbox API chuyển đổi Địa chỉ -> Vĩ độ/Kinh độ (Lat/Lng) và lưu vào DB. Không gọi API tính khoảng cách liên tục.
- **Tính khoảng cách**: Backend dùng công thức Haversine.
- **Distance Threshold**: Lưu trong `SystemSetting` (`distance_threshold = 5km`) để Admin có thể thay đổi, không hardcode.
- **Cơ chế**: Vẫn Auto-Approval và liên kết bình thường nếu quá Threshold, nhưng bật cảnh báo cho Provider và giáng cấp (không ưu tiên hiển thị) bởi Recommendation Engine.

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
- Hệ thống cung cấp sẵn các mẫu hợp đồng (Templates) cho các dịch vụ phổ biến (thuê phòng, điện, nước, internet...).
- Cung cấp sẵn các điều khoản chuẩn theo quy định của pháp luật và các trường hợp thường gặp.
- **Lưu ý quan trọng**: Hiện tại hệ thống *chưa hỗ trợ* chức năng cho phép Provider tự tạo hay quản lý các template hợp đồng riêng. Provider chỉ có thể sử dụng các template do hệ thống cung cấp.

### Snapshot Pattern Toàn Diện
Khi tạo một Contract từ Template, hệ thống sẽ **Deep Copy** không chỉ Template mà còn Snapshot luôn thông tin tại thời điểm đó của:
- `Template` (`templateId`, `templateVersion`, nội dung JSON).
- `Provider`, `Customer`, `Room`, `Service`, `Price`.
(Đảm bảo nếu sau này CCCD khách đổi, hợp đồng cũ vẫn giữ CCCD cũ).

### State Machine & Workflow Đàm Phán

```text
DRAFT -> PENDING_SIGNATURE -> ACTIVE -> EXPIRED / TERMINATED / CANCELLED
```

**Chi tiết luồng chạy:**
1. Provider tạo hợp đồng -> **`DRAFT`** (Được sửa thoải mái).
2. Provider chốt nội dung và gửi Khách -> **`PENDING_SIGNATURE`**.
   - Khách và Provider đều được xem.
   - Nếu cần sửa -> Provider **Thu hồi** hợp đồng về lại **`DRAFT`** (Ghi đè trực tiếp, không lưu Version cũ để tránh rườm rà). Các bên đã ký (nếu có) bị reset trạng thái.
3. Ký số (Multiple Signers qua bảng `ContractSigner`):
   - Khách hàng ký.
   - **Provider ký CUỐI CÙNG**.
4. Ký xong -> Sinh bản PDF cuối cùng.
5. Hash PDF -> Digital Signature -> **`ACTIVE`**.

---

## 10. Order Management (Dành cho EXTERNAL_SERVICE)

Với các dịch vụ ngoài không cần hợp đồng dài hạn (e.g. Dịch vụ sửa chữa lẻ), hệ thống sử dụng Đơn hàng (Orders).
- **Luồng trạng thái**: `PENDING -> CONFIRMED -> IN_PROGRESS -> COMPLETED / CANCELLED`.
- **Phân quyền**: Chỉ nhà cung cấp loại `EXTERNAL_SERVICE` mới sử dụng luồng này. Mọi thao tác xử lý tập trung vào việc cập nhật trạng thái đơn dịch vụ.

---

## 5. Signature Service Integration

`contract-service` quản lý Business Workflow, KHÔNG tự thực hiện ký số.

**Luồng giao tiếp:**
1. Khi Contract đủ điều kiện, `contract-service` sinh bản PDF cuối.
2. Bắn sang `signature-service`.
3. `signature-service` xử lý: Generate OTP -> Verify OTP -> Hash PDF -> Create Digital Signature -> Store Evidence (S3/IPFS).
4. Xong việc, `signature-service` publish Event lên Redis (VD: `SignatureCreated`).
5. `contract-service` nhận Event, đổi trạng thái hợp đồng thành `ACTIVE` (Event `ContractActivated`).

---

## 6. API Design (Business Oriented)

Thiết kế API hướng nghiệp vụ, thay vì chỉ CRUD:
- `POST /provider/contracts/{id}/submit` (Gửi cho khách)
- `POST /provider/contracts/{id}/cancel`
- `POST /provider/contracts/{id}/reopen`

---

## 7. OCR Flow (Màn hình Review)

Chỉ số không được lưu vào DB ngay lập tức.
**Luồng xử lý:** Upload Image -> Google Vision -> Trả về `Detected Value` -> Frontend Preview cạnh ảnh gốc -> Provider Review (Sửa tay nếu cần) -> **Confirm** -> Lưu Database.

---

## 8. Property Hierarchy Đồng Nhất

Bảo đảm cấu trúc đồng nhất từ Backend ra Frontend:
`Property` -> `Block` (Tòa nhà) -> `Floor` (Tầng) -> `Room` (Phòng)

---

## 9. Event Catalog (Redis Pub/Sub)

Định nghĩa rõ ràng các Event lưu thông giữa các Microservices:
- `ContractCreated`, `ContractSubmitted`, `ContractActivated`
- `ProviderVerified`
- `MeterReadingConfirmed`
- `PropertyCreated`
- `CustomerAssigned`, `CustomerRemoved`
*(Mỗi Event cần đặc tả: Publisher, Subscriber, Payload).*
