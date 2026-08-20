import { PrismaClient } from "@prisma/client-audit";

const prisma = new PrismaClient();

const auditLogId = (n: number) => `a0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const userId = (n: number) => `30000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const eventTypes = [
  ["LOGIN", "identity-service", "IDENTITY", "Đăng nhập thành công vào hệ thống."],
  ["CREATE_CONTRACT", "contract-service", "CONTRACT", "Tạo bản nháp hợp đồng dịch vụ."],
  ["UPDATE_CONTRACT", "contract-service", "CONTRACT", "Ký kết hợp đồng thành công."],
  ["CREATE_INVOICE", "billing-service", "INVOICE", "Khởi tạo hóa đơn theo kỳ thanh toán."],
  ["PAY_INVOICE", "billing-service", "INVOICE", "Ghi nhận thanh toán hóa đơn thành công."],
  ["SEND_NOTIFICATION", "notification-service", "NOTIFICATION", "Hệ thống tự động gửi thông báo."],
  ["CREATE_PROVIDER", "identity-service", "PROVIDER", "Tạo hồ sơ nhà cung cấp mới."],
  ["APPROVE", "identity-service", "PROVIDER", "Duyệt hồ sơ đăng ký kinh doanh."],
  ["UPDATE_PROPERTY", "catalog-service", "PROPERTY", "Cập nhật thông tin tòa nhà/phòng trọ."],
  ["CREATE_VIOLATION", "contract-service", "VIOLATION_CASE", "Ghi nhận phản ánh vi phạm hợp đồng."],
  ["RESOLVE_VIOLATION", "contract-service", "VIOLATION_CASE", "Đóng và xử lý tình huống vi phạm."],
] as const;

async function main() {
  await prisma.auditLog.deleteMany();

  const logs = [];
  for (let i = 0; i < 2000; i++) {
    const [action, serviceName, entityType, description] = eventTypes[i % eventTypes.length];
    
    // Pick user: mostly customers (101-150), sometimes admin (1) or providers (201-220)
    let uId;
    const r = Math.random();
    if (r < 0.1) uId = userId(1);
    else if (r < 0.3) uId = userId(201 + (i % 20));
    else uId = userId(101 + (i % 50));

    const pastDate = new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000);

    let entityIdStr = null;
    if (entityType === "CONTRACT") entityIdStr = `70000000-0000-0000-0000-${String((i % 150) + 1).padStart(12, "0")}`;
    if (entityType === "INVOICE") entityIdStr = `83000000-0000-0000-0000-${String((i % 450) + 1).padStart(12, "0")}`;
    if (entityType === "PROVIDER") entityIdStr = `40000000-0000-0000-0000-${String((i % 20) + 1).padStart(12, "0")}`;

    logs.push({
      id: auditLogId(i + 1),
      userId: uId,
      serviceName,
      action,
      entityType,
      entityId: entityIdStr,
      oldData: action === "UPDATE_CONTRACT" ? { status: "PENDING_SIGNATURE" } : null,
      newData: action === "UPDATE_CONTRACT" ? { status: "ACTIVE" } : (action === "PAY_INVOICE" ? { status: "PAID" } : null),
      ipAddress: `113.190.${(i % 255)}.${((i * 3) % 255)}`, // Realistic Vietnam IP range look-alike
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ServiceHubApp",
      description,
      createdAt: pastDate,
    });
  }

  for (let i = 0; i < logs.length; i += 500) {
    await prisma.auditLog.createMany({ data: logs.slice(i, i + 500), skipDuplicates: true });
  }

  console.log(`Đã seed audit-service: ${logs.length} nhật ký hệ thống.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
