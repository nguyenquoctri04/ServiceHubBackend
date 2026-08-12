import { PrismaClient } from "@prisma/client-notification";

const prisma = new PrismaClient();

const IDS = {
  templates: {
    WELCOME: "90000000-0000-0000-0000-000000000001",
    PAYMENT: "90000000-0000-0000-0000-000000000002",
    CONTRACT: "90000000-0000-0000-0000-000000000003",
    SERVICE: "90000000-0000-0000-0000-000000000004",
  },

  notifications: {
    NOTIFICATION_1: "91000000-0000-0000-0000-000000000001",
    NOTIFICATION_2: "91000000-0000-0000-0000-000000000002",
    NOTIFICATION_3: "91000000-0000-0000-0000-000000000003",
    NOTIFICATION_4: "91000000-0000-0000-0000-000000000004",
  },
};

const USERS = {
  CUSTOMER: "30000000-0000-0000-0000-000000000008",
  PROVIDER: "30000000-0000-0000-0000-000000000009",
  ADMIN: "30000000-0000-0000-0000-000000000001",
};

async function main() {
  console.log("🌱 Seeding notification service...");

  const now = new Date();

  // =========================================================
  // NOTIFICATION TEMPLATES
  // =========================================================

  await prisma.notificationTemplate.createMany({
    data: [
      {
        id: IDS.templates.WELCOME,
        code: "WELCOME_USER",
        title: "Chào mừng đến với ServiceHub",
        content:
          "Chào mừng bạn đến với ServiceHub. Chúc bạn có trải nghiệm tốt!",
        channel: "IN_APP",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },

      {
        id: IDS.templates.PAYMENT,
        code: "PAYMENT_SUCCESS",
        title: "Thanh toán thành công",
        content: "Thanh toán hóa đơn của bạn đã được thực hiện thành công.",
        channel: "IN_APP",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },

      {
        id: IDS.templates.CONTRACT,
        code: "CONTRACT_CREATED",
        title: "Hợp đồng mới",
        content: "Hợp đồng của bạn đã được tạo thành công.",
        channel: "EMAIL",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },

      {
        id: IDS.templates.SERVICE,
        code: "SERVICE_REQUEST",
        title: "Có yêu cầu dịch vụ mới",
        content: "Bạn vừa nhận được một yêu cầu dịch vụ mới.",
        channel: "PUSH",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  await prisma.notification.createMany({
    data: [
      {
        id: IDS.notifications.NOTIFICATION_1,
        userId: USERS.CUSTOMER,
        templateId: IDS.templates.WELCOME,
        title: "Chào mừng đến với ServiceHub",
        content: "Chào mừng Nguyễn Quốc Trí đến với ServiceHub.",
        channel: "IN_APP",
        status: "READ",
        sendAt: now,
      },

      {
        id: IDS.notifications.NOTIFICATION_2,
        userId: USERS.CUSTOMER,
        templateId: IDS.templates.PAYMENT,
        title: "Thanh toán thành công",
        content: "Hóa đơn INV-2026-0002 đã được thanh toán thành công.",
        channel: "IN_APP",
        status: "SENT",
        sendAt: now,
      },

      {
        id: IDS.notifications.NOTIFICATION_3,
        userId: USERS.PROVIDER,
        templateId: IDS.templates.SERVICE,
        title: "Có yêu cầu dịch vụ mới",
        content: "Bạn có một yêu cầu dịch vụ mới từ khách hàng.",
        channel: "PUSH",
        status: "PENDING",
        sendAt: now,
      },

      {
        id: IDS.notifications.NOTIFICATION_4,
        userId: USERS.ADMIN,
        templateId: IDS.templates.CONTRACT,
        title: "Hợp đồng mới được tạo",
        content: "Một hợp đồng mới đã được tạo trên hệ thống.",
        channel: "EMAIL",
        status: "SENT",
        sendAt: now,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Notification seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
