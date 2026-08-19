import { PrismaClient } from "@prisma/client-notification";

const prisma = new PrismaClient();

const now = new Date();

const users = [
    "30000000-0000-0000-0000-000000000001",
    "30000000-0000-0000-0000-000000000002",
    "30000000-0000-0000-0000-000000000003",
    "30000000-0000-0000-0000-000000000004",
    "30000000-0000-0000-0000-000000000005",
    "30000000-0000-0000-0000-000000000006",
    "30000000-0000-0000-0000-000000000007",
    "30000000-0000-0000-0000-000000000008",
    "30000000-0000-0000-0000-000000000009",
];

const templateId = (n: number) =>
    `90000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const notificationId = (n: number) =>
    `91000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

async function main() {
    await prisma.notificationTemplate.createMany({
        data: Array.from({ length: 20 }, (_, i) => ({
            id: templateId(i + 1),
            code: `THONG_BAO_${String(i + 1).padStart(3, "0")}`,
            title: [
                "Hợp đồng sắp hết hạn",
                "Hóa đơn mới",
                "Thanh toán thành công",
                "Thanh toán thất bại",
                "Dịch vụ đã được xác nhận",
                "Có yêu cầu đặt dịch vụ mới",
                "Hồ sơ nhà cung cấp đã được duyệt",
                "Hồ sơ nhà cung cấp cần bổ sung",
                "Chỉ số điện nước mới",
                "Yêu cầu vi phạm mới",
            ][i % 10],
            content:
                "Bạn có một thông báo mới trên hệ thống ServiceHub. Vui lòng kiểm tra thông tin chi tiết.",
            channel: ["IN_APP", "EMAIL", "SMS", "PUSH"][i % 4] as any,
            status: i % 9 === 0 ? ("INACTIVE" as const) : ("ACTIVE" as const),
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.notification.createMany({
        data: Array.from({ length: 300 }, (_, i) => ({
            id: notificationId(i + 1),
            userId: users[i % users.length],
            templateId: templateId((i % 20) + 1),
            title: [
                "Hợp đồng sắp hết hạn",
                "Hóa đơn mới",
                "Thanh toán thành công",
                "Cập nhật dịch vụ",
                "Thông báo hồ sơ",
            ][i % 5],
            content: [
                "Hợp đồng của bạn sắp đến ngày hết hạn. Vui lòng kiểm tra và gia hạn nếu cần.",
                "Hóa đơn mới đã được tạo. Bạn có thể xem chi tiết và thực hiện thanh toán.",
                "Khoản thanh toán của bạn đã được ghi nhận thành công.",
                "Dịch vụ của bạn vừa có thông tin cập nhật mới.",
                "Hồ sơ của bạn đã được cập nhật trạng thái.",
            ][i % 5],
            channel: ["IN_APP", "EMAIL", "SMS", "PUSH"][i % 4] as any,
            status: ["PENDING", "SENT", "READ", "FAILED"][i % 4] as any,
            sendAt: new Date(Date.now() - (i % 30) * 86400000),
            providerId:
                i % 3 === 0 ? "40000000-0000-0000-0000-000000000001" : null,
        })),
        skipDuplicates: true,
    });

    console.log("Đã seed notification-service.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
