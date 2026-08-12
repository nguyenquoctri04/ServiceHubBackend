# ServiceHub Backend – Hướng dẫn cho Agent (Agent Instructions)

## Bối cảnh dự án (Project context)
- Repository này là một NestJS microservices monorepo được xây dựng với TypeScript, Prisma, và PostgreSQL.
- Bao gồm một API Gateway và nhiều domain services (identity, provider, customer, property, etc.).
- Hãy đọc `project_documentation.md` và `README.md` để nắm tổng quan dự án và kiến trúc. Ưu tiên mã nguồn làm nguồn sự thật cuối cùng.
- **NGUỒN TÀI LIỆU CHÍNH THỨC (OFFICIAL SOURCE OF TRUTH)**: Sử dụng [https://docs.nestjs.com/](https://docs.nestjs.com/) làm tài liệu tham khảo chính thức và chuẩn mực cho mọi triển khai NestJS và microservices.

## Tài liệu chỉ lưu cục bộ (Local-only documentation)
- `project_documentation.md` và `AGENTS.md` là các tài liệu dự án chỉ lưu cục bộ (local-only).
- **QUY TẮC TỐI QUAN TRỌNG**: Không bao giờ stage, commit, hoặc push cả hai file này. Không sử dụng các lệnh Git hàng loạt như `git add .` hoặc `git commit -a` mà không loại trừ chúng một cách cẩn thận.
- **QUY TẮC TỐI QUAN TRỌNG**: KHÔNG thêm các file này vào `.gitignore`. Chúng phải luôn ở trạng thái untracked nhưng vắng mặt trong `.gitignore` ở cả Backend và Frontend trong suốt quá trình phát triển.
- Luôn kiểm tra `git status` và `git diff --staged` trước bất kỳ thao tác Git nào để đảm bảo cả hai tài liệu đều được loại trừ.

## Các lệnh (Commands)
- Cài đặt thư viện: `npm install`
- Chạy các service cụ thể: Kiểm tra `package.json` cho các script như `start:m1`, `start:m2`, `start:m3`, hoặc `start:all`.
- Kiểm tra lỗi (Lint): `npm run lint`
- Khởi tạo Prisma: `npm run prisma:generate`

## Kiến trúc và vị trí file (Architecture and placement)
- `apps/api-gateway/`: Điểm truy cập duy nhất. Xử lý xác thực, phân quyền (RBAC) và điều hướng request đến các microservices bên dưới.
- `apps/<service-name>/src/<feature>/`: Các microservice được thiết kế theo chuẩn **Feature-based Module** của NestJS. Mỗi domain (feature) sẽ có một thư mục riêng chứa `.module.ts`, `.controller.ts`, `.service.ts`, và thư mục `dto/`.
- `apps/<service-name>/src/prisma/`: Chứa `PrismaModule` và `PrismaService` riêng biệt cho từng service để trỏ đúng tới `@prisma/client-<service-name>`.
- `libs/common/`: Chứa code dùng chung (Exceptions, Interceptors, Decorators, Utils) được sử dụng trên toàn bộ microservices.
- **Database-per-service**: Các microservices không dùng chung bảng cơ sở dữ liệu. Tuyệt đối không thực hiện các lệnh join chéo giữa các service.

## Quy tắc API và bảo mật (API and security rules)
- `api-gateway` chịu trách nhiệm xác thực (auth validation). Các microservices nội bộ tin tưởng vào các request được chuyển tiếp bởi gateway.
- Validate toàn bộ các payload đầu vào bằng DTOs và các decorator của `class-validator`.
- Không bao giờ hard-code thông tin xác thực, chuỗi kết nối database, hoặc các secret. Luôn dựa vào cấu hình `.env`.
- Tuân thủ nghiêm ngặt các pattern REST và cấu trúc response đã thiết lập trong các controller hiện tại.

## Quy ước triển khai (Implementation conventions)
- Viết code NestJS theo hướng module hóa, dễ test. Sử dụng triệt để Dependency Injection.
- Giữ cho controller mỏng (thin). Business logic thuộc về services.
- Định nghĩa rõ ràng các TypeScript interfaces/types. Tránh sử dụng `any`.
- Phụ thuộc vào Prisma để truy xuất database. Tránh sử dụng raw SQL queries trừ khi thực sự cần thiết cho hiệu năng.
- Hỏi ý kiến trước khi thêm các thư viện lớn hoặc thay đổi cấu hình monorepo.
- Giữ nguyên các thay đổi hiện tại của người dùng. Giới hạn phạm vi từng công việc một cách nghiêm ngặt.
- Chỉ thêm comment để giải thích những logic khó hiểu hoặc các ràng buộc kỹ thuật.

## Quy trình làm việc bắt buộc (Required workflow)
1. Trước khi sửa code, đọc file đích, các DTO liên quan và xem một triển khai tương tự ở một service khác làm mẫu.
2. Với các thay đổi liên quan đến nhiều service, trình bày một kế hoạch ngắn gọn trình bày cách các service tương tác với nhau trước khi code.
3. Kiểm tra các lỗi biên dịch TS hoặc lỗi lint sau các thay đổi code lớn.
4. Xem lại `git diff` trước khi hand-off. **Không commit, push, hoặc đổi branch trừ khi được yêu cầu cụ thể; đảm bảo `project_documentation.md` và `AGENTS.md` luôn được loại trừ.**
5. Trong lần hand-off cuối, liệt kê các file đã thay đổi và bất kỳ giả định nào được đưa ra.
