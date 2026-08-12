import { PrismaClient } from "@prisma/client-notification";

const prisma = new PrismaClient();

const IDS = {
  templates: {
    INVOICE_CREATED: "b0000000-0000-0000-0000-000000000001",
    PAYMENT_SUCCESS: "b0000000-0000-0000-0000-000000000002",
    CONTRACT_SIGNED: "b0000000-0000-0000-0000-000000000003",
    METER_READING_REMINDER: "b0000000-0000-0000-0000-000000000004",
  },

  notifications: {
    INVOICE_CREATED: "b1000000-0000-0000-0000-000000000001",
    METER_REMINDER: "b1000000-0000-0000-0000-000000000002",
    CONTRACT_SIGNED: "b1000000-0000-0000-0000-000000000003",
  },

  customer1: "30000000-0000-0000-0000-000000000002",
};

const now = new Date();

async function main() {
  console.log("🌱 Seeding notification service...");

  // =========================
  // TEMPLATES
  // =========================

  await prisma.notificationTemplate.createMany({
    data: [
      {
        id: IDS.templates.INVOICE_CREATED,
        code: "INVOICE_CREATED",
        title: "Hóa đơn mới",
        content:
          "Hóa đơn {{invoiceNumber}} đã được tạo. Tổng tiền: {{amount}} VNĐ.",
        channel: "IN_APP",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.templates.PAYMENT_SUCCESS,
        code: "PAYMENT_SUCCESS",
        title: "Thanh toán thành công",
        content:
          "Thanh toán cho hóa đơn {{invoiceNumber}} đã được thực hiện thành công.",
        channel: "EMAIL",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.templates.CONTRACT_SIGNED,
        code: "CONTRACT_SIGNED",
        title: "Hợp đồng đã ký",
        content: "Hợp đồng {{contractNumber}} đã được ký và kích hoạt.",
        channel: "IN_APP",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.templates.METER_READING_REMINDER,
        code: "METER_READING_REMINDER",
        title: "Nhắc ghi chỉ số",
        content: "Vui lòng ghi chỉ số điện/nước cho kỳ thanh toán hiện tại.",
        channel: "PUSH",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // NOTIFICATIONS
  // =========================

  await prisma.notification.createMany({
    data: [
      {
        id: IDS.notifications.INVOICE_CREATED,
        userId: IDS.customer1,
        templateId: IDS.templates.INVOICE_CREATED,
        title: "Hóa đơn mới",
        content:
          "Hóa đơn INV-2026-0001 đã được tạo với tổng tiền 5,991,000 VNĐ.",
        channel: "IN_APP",
        status: "SENT",
        sendAt: new Date("2026-08-01T08:00:00"),
      },
      {
        id: IDS.notifications.METER_REMINDER,
        userId: IDS.customer1,
        templateId: IDS.templates.METER_READING_REMINDER,
        title: "Nhắc ghi chỉ số",
        content:
          "Vui lòng ghi chỉ số điện/nước cho kỳ thanh toán tháng 08/2026.",
        channel: "PUSH",
        status: "SENT",
        sendAt: new Date("2026-08-31T08:00:00"),
      },
      {
        id: IDS.notifications.CONTRACT_SIGNED,
        userId: IDS.customer1,
        templateId: IDS.templates.CONTRACT_SIGNED,
        title: "Hợp đồng đã ký",
        content: "Hợp đồng CTR-2026-0001 đã được ký và đang có hiệu lực.",
        channel: "IN_APP",
        status: "READ",
        sendAt: new Date("2026-07-30T10:00:00"),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Notification seed completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
