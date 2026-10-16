import { PrismaClient, AuditAction } from "@prisma/client-audit";

const prisma = new PrismaClient();
const now = new Date();

// Cross-service UUID generators (Đồng bộ chuẩn 100% với identity, catalog, contract, billing, notification)
const auditLogId = (n: number) => `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// Danh mục các sự kiện kiểm toán đại diện cho tất cả các microservices trong hệ thống
const auditEvents = [
    {
        action: "LOGIN" as AuditAction,
        service: "identity-service",
        entityType: "IDENTITY",
        desc: "Đăng nhập thành công vào hệ thống ServiceHub qua xác thực JWT.",
        oldData: null,
        newData: { method: "PASSWORD", mfa: false, status: "SUCCESS" },
    },
    {
        action: "LOGIN_FAILED" as AuditAction,
        service: "identity-service",
        entityType: "IDENTITY",
        desc: "Đăng nhập thất bại do nhập sai mật khẩu quá 3 lần.",
        oldData: null,
        newData: { reason: "INVALID_CREDENTIALS", attempts: 3 },
    },
    {
        action: "CREATE_PROVIDER" as AuditAction,
        service: "identity-service",
        entityType: "PROVIDER",
        desc: "Đăng ký hồ sơ pháp nhân nhà cung cấp mới.",
        oldData: null,
        newData: { status: "PENDING", licenseSubmitted: true },
    },
    {
        action: "APPROVE" as AuditAction,
        service: "identity-service",
        entityType: "PROVIDER",
        desc: "Quản trị viên phê duyệt hồ sơ kinh doanh và cấp phép hoạt động.",
        oldData: { status: "PENDING" },
        newData: { status: "ACTIVE", approvedBy: "ADMIN" },
    },
    {
        action: "SWITCH_PROVIDER_PROFILE" as AuditAction,
        service: "identity-service",
        entityType: "IDENTITY",
        desc: "Chuyển đổi ngữ cảnh làm việc sang chế độ Quản lý Nhà cung cấp.",
        oldData: { activeRole: "CUSTOMER" },
        newData: { activeRole: "PROVIDER" },
    },
    {
        action: "CREATE_PROPERTY" as AuditAction,
        service: "catalog-service",
        entityType: "PROPERTY",
        desc: "Khởi tạo thông tin bất động sản / khu căn hộ lưu trú mới.",
        oldData: null,
        newData: { status: "ACTIVE", totalBlocks: 2 },
    },
    {
        action: "CREATE_ROOM" as AuditAction,
        service: "catalog-service",
        entityType: "ROOM",
        desc: "Thêm phòng ở mới vào cơ sở dữ liệu tầng của tòa nhà.",
        oldData: null,
        newData: { status: "ACTIVE", roomNumber: "P.201" },
    },
    {
        action: "CREATE_CONTRACT" as AuditAction,
        service: "contract-service",
        entityType: "CONTRACT",
        desc: "Khởi tạo dự thảo hợp đồng dịch vụ từ yêu cầu của khách hàng.",
        oldData: null,
        newData: { status: "DRAFT", templateCode: "HD-HOUSING-V2" },
    },
    {
        action: "UPDATE_CONTRACT" as AuditAction,
        service: "contract-service",
        entityType: "CONTRACT",
        desc: "Hoàn thiện điều khoản hợp đồng và kết xuất file PDF kèm mã hash.",
        oldData: { status: "DRAFT" },
        newData: { status: "PENDING_SIGNATURE", hashGenerated: true },
    },
    {
        action: "SIGN_CONTRACT" as AuditAction,
        service: "contract-service",
        entityType: "CONTRACT",
        desc: "Khách hàng thực hiện ký số điện tử GPG thành công lên hợp đồng.",
        oldData: { status: "PENDING_SIGNATURE" },
        newData: { status: "ACTIVE", signedMethod: "GPG_DIGITAL_SIGNATURE" },
    },
    {
        action: "TERMINATE_CONTRACT" as AuditAction,
        service: "contract-service",
        entityType: "CONTRACT",
        desc: "Chấm dứt hợp đồng dịch vụ trước hạn theo thỏa thuận song phương.",
        oldData: { status: "ACTIVE" },
        newData: { status: "TERMINATED", earlyTermination: true },
    },
    {
        action: "CREATE_VIOLATION" as AuditAction,
        service: "contract-service",
        entityType: "VIOLATION_CASE",
        desc: "Tiếp nhận tố cáo vi phạm nội quy và thiết lập hồ sơ xác minh.",
        oldData: null,
        newData: { status: "REPORTED", evidenceAttached: true },
    },
    {
        action: "RESOLVE_VIOLATION" as AuditAction,
        service: "contract-service",
        entityType: "VIOLATION_CASE",
        desc: "Hoàn tất xác minh và ban hành quyết định kỷ luật xử lý vi phạm.",
        oldData: { status: "REPORTED" },
        newData: { status: "RESOLVED", actionApplied: "FINE" },
    },
    {
        action: "RESTRICT_CUSTOMER" as AuditAction,
        service: "contract-service",
        entityType: "RESTRICTION",
        desc: "Áp dụng biện pháp hạn chế tạo hợp đồng mới đối với tài khoản vi phạm.",
        oldData: null,
        newData: { scope: "PLATFORM", durationDays: 14 },
    },
    {
        action: "CREATE_APPEAL" as AuditAction,
        service: "contract-service",
        entityType: "VIOLATION_APPEAL",
        desc: "Người bị xử phạt gửi đơn khiếu nại yêu cầu xem xét lại quyết định.",
        oldData: null,
        newData: { status: "PENDING" },
    },
    {
        action: "REVIEW_APPEAL" as AuditAction,
        service: "contract-service",
        entityType: "VIOLATION_APPEAL",
        desc: "Hội đồng quản trị xem xét chứng cứ và chấp thuận đơn khiếu nại.",
        oldData: { status: "PENDING" },
        newData: { status: "APPROVED", restrictionLifted: true },
    },
    {
        action: "CREATE_INVOICE" as AuditAction,
        service: "billing-service",
        entityType: "INVOICE",
        desc: "Tự động chốt kỳ chỉ số điện nước và phát hành hóa đơn thanh toán.",
        oldData: null,
        newData: { status: "UNPAID", autoGenerated: true },
    },
    {
        action: "PAY_INVOICE" as AuditAction,
        service: "billing-service",
        entityType: "INVOICE",
        desc: "Xác nhận thanh toán hóa đơn thành công qua cổng thanh toán VNPAY.",
        oldData: { status: "UNPAID" },
        newData: { status: "PAID", gateway: "VNPAY", amountPaid: true },
    },
    {
        action: "SEND_NOTIFICATION" as AuditAction,
        service: "notification-service",
        entityType: "NOTIFICATION",
        desc: "Hệ thống phát thông báo đẩy PUSH và Email đến thiết bị người dùng.",
        oldData: null,
        newData: { channel: "PUSH", deliveryStatus: "DELIVERED" },
    },
];

// Danh sách IP thực tế tại các nhà mạng Việt Nam (Viettel, VNPT, FPT)
const vnIpPool = [
    "113.161.72.10", "113.190.23.45", "113.185.12.89", // VNPT
    "171.244.18.52", "171.255.45.19", "27.72.88.102",  // Viettel
    "118.69.182.4",  "1.53.210.99",   "42.112.33.67",  // FPT
];

// User-Agent thực tế của các thiết bị phổ biến
const userAgentPool = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
];

async function main() {
    console.log("--> Đang seed Audit Service...");

    // 1. CLEAR DỮ LIỆU CŨ
    await prisma.auditLog.deleteMany();

    // 2. TẠO 1,000 NHẬT KÝ KIỂM TOÁN HỆ THỐNG
    const logInserts = [];
    let logCounter = 1;

    for (let i = 1; i <= 1000; i++) {
        const evtIdx = (i - 1) % auditEvents.length;
        const evt = auditEvents[evtIdx];

        // Phân bổ người thực hiện hành vi:
        // Admin (userId 1-2): 20%
        // Providers (userId 201-225): 30%
        // Customers (userId 101-160): 50%
        let actorUserId: string;
        if (i % 5 === 0) {
            actorUserId = userId((i % 2) + 1); // Admin 1 hoặc 2
        } else if (i % 3 === 0) {
            actorUserId = userId(201 + (i % 25)); // Provider 201 -> 225
        } else {
            actorUserId = userId(101 + (i % 60)); // Customer 101 -> 160
        }

        // Tạo mốc thời gian trải dài trong 90 ngày qua
        const pastDate = new Date(Date.now() - (i * 3600000 * 2));

        // Ghép entityId thật theo entityType
        let targetEntityId: string | null = null;
        if (evt.entityType === "CONTRACT") {
            targetEntityId = `70000000-0000-4000-8000-${String((i % 160) + 1).padStart(12, "0")}`;
        } else if (evt.entityType === "INVOICE") {
            targetEntityId = `83000000-0000-4000-8000-${String((i % 200) + 1).padStart(12, "0")}`;
        } else if (evt.entityType === "PROVIDER") {
            targetEntityId = `40000000-0000-4000-8000-${String((i % 25) + 1).padStart(12, "0")}`;
        } else if (evt.entityType === "PROPERTY") {
            targetEntityId = `67000000-0000-4000-8000-${String((i % 10) + 1).padStart(12, "0")}`;
        } else if (evt.entityType === "ROOM") {
            targetEntityId = `6b000000-0000-4000-8000-${String((i % 400) + 1).padStart(12, "0")}`;
        } else if (evt.entityType === "VIOLATION_CASE") {
            targetEntityId = `77000000-0000-4000-8000-${String((i % 24) + 1).padStart(12, "0")}`;
        }

        const ip = vnIpPool[i % vnIpPool.length];
        const ua = userAgentPool[i % userAgentPool.length];

        logInserts.push({
            id: auditLogId(logCounter++),
            userId: actorUserId,
            serviceName: evt.service,
            action: evt.action,
            entityType: evt.entityType,
            entityId: targetEntityId,
            oldData: evt.oldData,
            newData: evt.newData,
            ipAddress: ip,
            userAgent: ua,
            description: evt.desc,
            createdAt: pastDate,
        });
    }

    // Insert theo chunks
    for (let i = 0; i < logInserts.length; i += 500) {
        await prisma.auditLog.createMany({
            data: logInserts.slice(i, i + 500),
            skipDuplicates: true,
        });
    }

    console.log(`✅ Seed Audit Service thành công:`);
    console.log(`   - ${logInserts.length} Bản ghi nhật ký kiểm toán (Đầy đủ hành động: Đăng nhập, Duyệt hồ sơ, Ký số GPG, Hóa đơn, Vi phạm, Khiếu nại, Khóa quyền).`);
}

main()
    .catch((e) => {
        console.error("❌ Lỗi seed Audit Service:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
