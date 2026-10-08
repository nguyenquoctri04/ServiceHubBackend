import { PrismaClient } from "@prisma/client-notification";

const prisma = new PrismaClient();
const now = new Date();

const templateId = (n: number) => `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const notificationId = (n: number) => `91000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const providerId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const templateDefs = [
    ["Hợp đồng sắp hết hạn", "Hợp đồng thuê phòng của bạn sắp đến ngày hết hạn. Vui lòng liên hệ ban quản lý để gia hạn.", "IN_APP"],
    ["Hóa đơn mới", "Bạn có một hóa đơn mới cho kỳ thanh toán vừa qua. Vui lòng kiểm tra và thanh toán.", "EMAIL"],
    ["Thanh toán thành công", "Cảm ơn bạn, hệ thống đã ghi nhận khoản thanh toán thành công.", "IN_APP"],
    ["Thanh toán thất bại", "Giao dịch thanh toán của bạn bị từ chối. Vui lòng kiểm tra lại số dư hoặc thẻ.", "SMS"],
    ["Dịch vụ đã được xác nhận", "Yêu cầu dịch vụ của bạn đã được đối tác tiếp nhận và sẽ sớm được thực hiện.", "IN_APP"],
    ["Có yêu cầu đặt dịch vụ mới", "Bạn nhận được một yêu cầu đặt dịch vụ mới từ khách hàng.", "PUSH"],
    ["Hồ sơ nhà cung cấp đã được duyệt", "Chúc mừng! Hồ sơ nhà cung cấp của bạn đã được phê duyệt.", "EMAIL"],
    ["Hồ sơ nhà cung cấp cần bổ sung", "Hồ sơ của bạn còn thiếu sót, vui lòng cập nhật lại thông tin giấy phép.", "EMAIL"],
    ["Chỉ số điện nước mới", "Ban quản lý đã cập nhật chỉ số điện nước mới nhất cho phòng của bạn.", "IN_APP"],
    ["Yêu cầu vi phạm mới", "Có một báo cáo vi phạm liên quan đến dịch vụ của bạn.", "PUSH"]
] as const;

async function main() {
    await prisma.notification.deleteMany();
    await prisma.notificationTemplate.deleteMany();

    // 1. TEMPLATES
    await prisma.notificationTemplate.createMany({
        data: templateDefs.map((def, i) => ({
            id: templateId(i + 1),
            code: `THONG_BAO_${String(i + 1).padStart(3, "0")}`,
            title: def[0],
            content: def[1],
            channel: def[2] as any,
            status: "ACTIVE" as const,
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    // 2. NOTIFICATIONS (generate 1500 notifications for 50 customers and 20 providers)
    const notifications = [];
    for (let i = 0; i < 1500; i++) {
        // Customers 101-150 (80%), Providers 201-220 (20%)
        const isCustomer = Math.random() < 0.8;
        const targetUserId = isCustomer ? userId(101 + (i % 50)) : userId(201 + (i % 20));
        const tempIdx = Math.floor(Math.random() * templateDefs.length);
        
        const pastDate = new Date(now.getTime() - Math.floor(Math.random() * 180) * 86400000); // within last 6 months

        notifications.push({
            id: notificationId(i + 1),
            userId: targetUserId,
            templateId: templateId(tempIdx + 1),
            title: templateDefs[tempIdx][0],
            content: templateDefs[tempIdx][1],
            channel: templateDefs[tempIdx][2] as any,
            status: ["SENT", "READ", "READ", "READ"][i % 4] as any,
            sendAt: pastDate,
            providerId: !isCustomer ? providerId((i % 20) + 1) : null,
        });
    }

    for (let i = 0; i < notifications.length; i += 500) {
        await prisma.notification.createMany({ data: notifications.slice(i, i + 500), skipDuplicates: true });
    }

    console.log(`Đã seed notification-service: ${notifications.length} thông báo.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
