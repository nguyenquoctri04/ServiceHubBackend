# ServiceHub Backend 🏢

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

ServiceHub là một nền tảng quản lý dịch vụ và hợp đồng điện tử (Marketplace 3 chiều) được xây dựng theo kiến trúc Microservices. Hệ thống kết nối **Nhà cung cấp** (chủ trọ, BQL chung cư), **Khách hàng** (cư dân, người thuê) và **Quản trị viên** nhằm số hóa toàn bộ quy trình quản lý bất động sản, hợp đồng điện tử và thanh toán hóa đơn.

## ✨ Tính năng nổi bật

- **Kiến trúc Microservices:** Hệ thống mở rộng linh hoạt, áp dụng triệt để nguyên tắc Database-per-Service.
- **Phân quyền chặt chẽ (RBAC):** Định tuyến và kiểm duyệt quyền truy cập riêng biệt cho Admin, Provider và Customer thông qua API Gateway.
- **Hợp đồng điện tử & Ký số:** Tự động tạo hợp đồng từ mẫu, hỗ trợ chữ ký số mã hóa GPG.
- **Thanh toán & Hóa đơn tự động:** Tự động lập hóa đơn dựa trên chỉ số điện/nước và bảng giá dịch vụ cấu hình sẵn.
- **Audit Logging:** Theo dõi và ghi vết mọi thao tác trên hệ thống theo chuẩn ISO/IEC.

## 🛠 Công nghệ cốt lõi

- **Framework:** NestJS (TypeScript Monorepo)
- **Cơ sở dữ liệu:** PostgreSQL (Neon Cloud)
- **ORM:** Prisma (Code-First)
- **Xác thực:** JWT (Access & Refresh Tokens)

## 🚀 Hướng dẫn cài đặt nhanh

### Yêu cầu hệ thống
- Node.js (v18.x hoặc v20.x LTS)
- NestJS CLI (`npm i -g @nestjs/cli`)

### Các bước cài đặt

1. **Clone mã nguồn:**
   ```bash
   git clone <repo-url>
   cd ServiceHubBackend
   ```

2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường:**
   Tạo file `.env` từ file mẫu và điền thông tin Database của bạn:
   ```bash
   cp .env.example .env
   ```

4. **Khởi tạo Database:**
   Đẩy cấu trúc bảng (Schema) lên Database của bạn (Chạy các lệnh tương ứng với service bạn phụ trách):
   ```bash
   # Nhóm hệ thống
   npx prisma db push --schema apps/identity-service/prisma/schema.prisma
   npx prisma db push --schema apps/billing-service/prisma/schema.prisma
   # ... (Lặp lại cho các service khác)
   ```

5. **Khởi chạy ứng dụng:**
   ```bash
   # Chạy toàn bộ hệ thống (Yêu cầu RAM cao)
   npm run start:all
   
   # Hoặc chạy theo từng phân hệ để tối ưu tài nguyên:
   npm run start:m1   # Phân hệ: Catalog
   npm run start:m2   # Phân hệ: Contract, Signature
   npm run start:m3   # Phân hệ: Gateway, Identity, Billing, Notification, Audit
   ```

## 🏗 Tổng quan kiến trúc

Toàn bộ hệ thống hoạt động thông qua một **API Gateway** trung tâm (Port 3000) đảm nhiệm việc xác thực, điều hướng và giới hạn lưu lượng (rate-limiting). Đứng sau Gateway hiện tại là 7 Microservices độc lập (`identity`, `catalog`, `contract`, `signature`, `billing`, `notification`, `audit`). Mọi service đều tuân thủ nguyên tắc cách ly dữ liệu tuyệt đối và chỉ giao tiếp chéo thông qua HTTP/RPC khi thực sự cần thiết.

## 📚 Tài liệu tham khảo

- **API Documentation:** Truy cập Swagger UI tại endpoint `/api/docs` khi chạy API Gateway.
- **Tiêu chuẩn Code & Kiến trúc chuyên sâu:** Vui lòng tra cứu tài liệu nội bộ của team hoặc xem lại Git History để biết các quy tắc monolithic cũ.

## 📄 Giấy phép
Dự án được cấp phép theo chuẩn MIT License.
