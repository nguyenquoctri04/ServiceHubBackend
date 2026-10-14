import { PrismaClient, NotificationChannel, NotificationStatus, NotificationKind, NotificationTargetType, NotificationTemplateStatus } from "@prisma/client-notification";

const prisma = new PrismaClient();
const now = new Date();

// Cross-service UUID generators (Đồng bộ chuẩn 100% với identity, catalog, contract, billing, audit)
const userId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const templateId = (n: number) => `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const notificationId = (n: number) => `91000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const templatesData = [
    {
        id: 1,
        code: "TPL_CONTRACT_SIGNING",
        title: "Yêu cầu ký số hợp đồng điện tử",
        content: "Hợp đồng dịch vụ của bạn đã được hoàn thiện. Vui lòng kiểm tra bản thể hiện PDF và thực hiện ký số.",
        channel: "IN_APP" as NotificationChannel,
    },
    {
        id: 2,
        code: "TPL_CONTRACT_ACTIVE",
        title: "Hợp đồng đã có hiệu lực pháp lý",
        content: "Chúc mừng! Hợp đồng của bạn đã được các bên ký kết thành công và chính thức có hiệu lực từ hôm nay.",
        channel: "EMAIL" as NotificationChannel,
    },
    {
        id: 3,
        code: "TPL_CONTRACT_EXPIRING",
        title: "Thông báo hợp đồng sắp hết hạn",
        content: "Hợp đồng thuê phòng của bạn sẽ hết hạn trong 30 ngày tới. Vui lòng liên hệ ban quản lý nếu có nhu cầu gia hạn.",
        channel: "IN_APP" as NotificationChannel,
    },
    {
        id: 4,
        code: "TPL_INVOICE_NEW",
        title: "Thông báo phát hành hóa đơn kỳ mới",
        content: "Hóa đơn tiền thuê và tiện ích sinh hoạt tháng này đã được lập. Vui lòng thanh toán trước ngày 05.",
        channel: "EMAIL" as NotificationChannel,
    },
    {
        id: 5,
        code: "TPL_PAYMENT_SUCCESS",
        title: "Xác nhận thanh toán thành công",
        content: "Hệ thống ServiceHub đã ghi nhận giao dịch thanh toán thành công. Cảm ơn quý khách!",
        channel: "IN_APP" as NotificationChannel,
    },
    {
        id: 6,
        code: "TPL_PAYMENT_OVERDUE",
        title: "Cảnh báo quá hạn thanh toán",
        content: "Hóa đơn của bạn đã quá hạn thanh toán. Vui lòng hoàn tất nghĩa vụ tài chính để tránh gián đoạn dịch vụ.",
        channel: "SMS" as NotificationChannel,
    },
    {
        id: 7,
        code: "TPL_METER_READING",
        title: "Cập nhật chỉ số điện nước",
        content: "Kỹ thuật viên tòa nhà đã cập nhật chỉ số đồng hồ điện nước mới nhất cho phòng của bạn.",
        channel: "PUSH" as NotificationChannel,
    },
    {
        id: 8,
        code: "TPL_VIOLATION_REPORTED",
        title: "Ghi nhận phản ánh vi phạm nội quy",
        content: "Hệ thống tiếp nhận phản ánh vi phạm liên quan đến hợp đồng của bạn. Vui lòng phối hợp giải quyết.",
        channel: "PUSH" as NotificationChannel,
    },
    {
        id: 9,
        code: "TPL_VIOLATION_RESOLVED",
        title: "Thông báo kết quả xử lý vi phạm",
        content: "Vụ việc vi phạm đã được ban quản trị và các bên liên quan xử lý dứt điểm theo quy chế.",
        channel: "IN_APP" as NotificationChannel,
    },
    {
        id: 10,
        code: "TPL_SERVICE_BOOKED",
        title: "Yêu cầu dịch vụ mới từ khách hàng",
        content: "Bạn có một yêu cầu đặt lịch dịch vụ mới cần xác nhận từ khách hàng trên hệ thống.",
        channel: "PUSH" as NotificationChannel,
    },
    {
        id: 11,
        code: "TPL_EKYC_VERIFIED",
        title: "Định danh điện tử eKYC thành công",
        content: "Hồ sơ Căn cước công dân và sinh trắc học khuôn mặt của bạn đã được xác thực cấp độ 2.",
        channel: "EMAIL" as NotificationChannel,
    },
    {
        id: 12,
        code: "TPL_SYSTEM_BROADCAST",
        title: "Thông báo nâng cấp hệ thống định kỳ",
        content: "ServiceHub sẽ tiến hành bảo trì hạ tầng từ 01:00 đến 03:00 sáng mai nhằm nâng cao chất lượng dịch vụ.",
        channel: "IN_APP" as NotificationChannel,
    },
];

async function main() {
    console.log("--> Đang seed Notification Service...");

    // 1. CLEAR DỮ LIỆU CŨ THEO ĐÚNG THỨ TỰ PHỤ THUỘC
    await prisma.notification.deleteMany();
    await prisma.notificationTemplate.deleteMany();

    // 2. TẠO 12 MẪU THÔNG BÁO (NOTIFICATION TEMPLATES)
    await prisma.notificationTemplate.createMany({
        data: templatesData.map(t => ({
            id: templateId(t.id),
            code: t.code,
            title: t.title,
            content: t.content,
            channel: t.channel,
            status: "ACTIVE" as NotificationTemplateStatus,
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    // 3. TẠO 600 THÔNG BÁO THỰC TẾ
    // Phân bổ: Khách hàng (101-160), Nhà cung cấp (201-225), Quản trị viên (1-2)
    const notificationInserts = [];
    let notifCounter = 1;

    for (let i = 1; i <= 600; i++) {
        const notifDbId = notificationId(notifCounter++);
        const tplIdx = ((i - 1) % templatesData.length);
        const tpl = templatesData[tplIdx];

        // Phân loại người nhận
        let targetUserId: string;
        if (i % 10 === 0) {
            targetUserId = userId(1); // Admin
        } else if (i % 3 === 0) {
            // Nhà cung cấp (Provider identity: 201 -> 225)
            const provNum = 201 + ((i % 25));
            targetUserId = userId(provNum);
        } else {
            // Khách hàng (Customer identity: 101 -> 160)
            const custNum = 101 + ((i % 60));
            targetUserId = userId(custNum);
        }

        // Trạng thái thông báo thực tế: 60% READ, 30% SENT, 8% PENDING, 2% FAILED
        let status: NotificationStatus = "READ";
        const rand = i % 100;
        if (rand < 60) status = "READ";
        else if (rand < 90) status = "SENT";
        else if (rand < 98) status = "PENDING";
        else status = "FAILED";

        const pastDate = new Date(Date.now() - (i * 3600000 * 4)); // Trải dài theo các mốc thời gian
        const deliveredAt = status !== "PENDING" ? new Date(pastDate.getTime() + 5000) : null;
        const readAt = status === "READ" ? new Date(pastDate.getTime() + 1800000) : null;

        // Xác định loại thực thể liên kết (entityType & entityId)
        let entityType: string | null = null;
        let entityId: string | null = null;
        if (tpl.code.includes("CONTRACT")) {
            entityType = "CONTRACT";
            entityId = `70000000-0000-4000-8000-${String((i % 160) + 1).padStart(12, "0")}`;
        } else if (tpl.code.includes("INVOICE") || tpl.code.includes("PAYMENT")) {
            entityType = "INVOICE";
            entityId = `83000000-0000-4000-8000-${String((i % 200) + 1).padStart(12, "0")}`;
        } else if (tpl.code.includes("VIOLATION")) {
            entityType = "VIOLATION_CASE";
            entityId = `77000000-0000-4000-8000-${String((i % 24) + 1).padStart(12, "0")}`;
        }

        notificationInserts.push({
            id: notifDbId,
            userId: targetUserId,
            templateId: templateId(tpl.id),
            kind: tpl.code === "TPL_SYSTEM_BROADCAST" ? ("BROADCAST" as NotificationKind) : ("EVENT" as NotificationKind),
            eventType: tpl.code,
            targetType: tpl.code === "TPL_SYSTEM_BROADCAST" ? ("ALL" as NotificationTargetType) : ("USER" as NotificationTargetType),
            actorId: userId(1), // Hệ thống hoặc Admin phát hành
            createdBy: userId(1),
            entityType,
            entityId,
            payload: {
                templateCode: tpl.code,
                targetUserId,
                generatedAt: pastDate.toISOString(),
            },
            title: tpl.title,
            content: tpl.content,
            channel: tpl.channel,
            status,
            sendAt: pastDate,
            deliveredAt,
            readAt,
            createdAt: pastDate,
            updatedAt: readAt || deliveredAt || pastDate,
        });
    }

    // Insert theo chunks
    for (let i = 0; i < notificationInserts.length; i += 300) {
        await prisma.notification.createMany({
            data: notificationInserts.slice(i, i + 300),
            skipDuplicates: true,
        });
    }

    console.log(`✅ Seed Notification Service thành công:`);
    console.log(`   - ${templatesData.length} Mẫu thông báo hệ thống.`);
    console.log(`   - ${notificationInserts.length} Thông báo thực tế (Đầy đủ IN_APP, EMAIL, SMS, PUSH với status READ, SENT, PENDING, FAILED).`);
}

main()
    .catch((e) => {
        console.error("❌ Lỗi seed Notification Service:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
