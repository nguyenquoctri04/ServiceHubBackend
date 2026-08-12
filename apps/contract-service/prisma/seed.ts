import { PrismaClient } from "@prisma/client-contract";

const prisma = new PrismaClient();

const IDS = {
  contracts: {
    CONTRACT_1: "70000000-0000-0000-0000-000000000001",
    CONTRACT_2: "70000000-0000-0000-0000-000000000002",
  },

  contractServices: {
    CS_1: "71000000-0000-0000-0000-000000000001",
    CS_2: "71000000-0000-0000-0000-000000000002",
    CS_3: "71000000-0000-0000-0000-000000000003",
  },

  periods: {
    PERIOD_1: "72000000-0000-0000-0000-000000000001",
    PERIOD_2: "72000000-0000-0000-0000-000000000002",
  },

  terms: {
    TERM_1: "73000000-0000-0000-0000-000000000001",
    TERM_2: "73000000-0000-0000-0000-000000000002",
  },

  contractTerms: {
    CT_1: "74000000-0000-0000-0000-000000000001",
    CT_2: "74000000-0000-0000-0000-000000000002",
  },

  templates: {
    TEMPLATE_1: "75000000-0000-0000-0000-000000000001",
  },

  violationRules: {
    RULE_1: "76000000-0000-0000-0000-000000000001",
    RULE_2: "76000000-0000-0000-0000-000000000002",
  },
};

const USERS = {
  ADMIN: "30000000-0000-0000-0000-000000000001",
  CUSTOMER: "30000000-0000-0000-0000-000000000008",
  PROVIDER: "30000000-0000-0000-0000-000000000009",
};

const CATALOG = {
  ROOM: "63000000-0000-0000-0000-000000000001",
  CLEANING: "63000000-0000-0000-0000-000000000002",
};

const ROOMS = {
  ROOM_101: "66000000-0000-0000-0000-000000000001",
  ROOM_102: "66000000-0000-0000-0000-000000000002",
};

async function main() {
  console.log("🌱 Seeding contract service...");

  const now = new Date();

  // =========================================================
  // TERMS
  // =========================================================

  await prisma.term.createMany({
    data: [
      {
        id: IDS.terms.TERM_1,
        content:
          "Khách hàng có trách nhiệm thanh toán đầy đủ và đúng hạn theo thỏa thuận.",
        status: "ACTIVE",
        createdAt: now,
      },
      {
        id: IDS.terms.TERM_2,
        content:
          "Khách hàng phải bảo quản tài sản và cơ sở vật chất trong thời gian sử dụng.",
        status: "ACTIVE",
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // CONTRACT TEMPLATE
  // =========================================================

  await prisma.contractTemplate.createMany({
    data: [
      {
        id: IDS.templates.TEMPLATE_1,
        providerId: USERS.PROVIDER,
        name: "Hợp đồng thuê phòng",
        description: "Mẫu hợp đồng thuê phòng tiêu chuẩn",
        content: {
          title: "HỢP ĐỒNG THUÊ PHÒNG",
          sections: [
            "Thông tin các bên",
            "Thông tin phòng",
            "Giá thuê",
            "Thanh toán",
            "Quyền và nghĩa vụ",
          ],
        },
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // CONTRACTS
  // =========================================================

  await prisma.contract.createMany({
    data: [
      {
        id: IDS.contracts.CONTRACT_1,
        contractNumber: "HD-2026-0001",
        roomId: ROOMS.ROOM_101,
        customerId: USERS.CUSTOMER,
        startDate: new Date("2026-08-01"),
        endDate: new Date("2027-08-01"),
        status: "ACTIVE",
        requireSignature: true,
        signedAt: new Date("2026-07-31"),
        createdAt: now,
        updatedAt: now,
      },

      {
        id: IDS.contracts.CONTRACT_2,
        contractNumber: "HD-2026-0002",
        roomId: ROOMS.ROOM_102,
        customerId: "30000000-0000-0000-0000-000000000002",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2027-08-01"),
        status: "ACTIVE",
        requireSignature: true,
        signedAt: new Date("2026-07-31"),
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // CONTRACT SERVICES
  // =========================================================

  await prisma.contractService.createMany({
    data: [
      {
        id: IDS.contractServices.CS_1,
        contractId: IDS.contracts.CONTRACT_1,
        servicePriceId: CATALOG.ROOM,
        quantity: 1,
        createdAt: now,
      },
      {
        id: IDS.contractServices.CS_2,
        contractId: IDS.contracts.CONTRACT_1,
        servicePriceId: CATALOG.CLEANING,
        quantity: 2,
        createdAt: now,
      },
      {
        id: IDS.contractServices.CS_3,
        contractId: IDS.contracts.CONTRACT_2,
        servicePriceId: CATALOG.ROOM,
        quantity: 1,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // BILLING PERIODS
  // =========================================================

  await prisma.billingPeriod.createMany({
    data: [
      {
        id: IDS.periods.PERIOD_1,
        contractId: IDS.contracts.CONTRACT_1,
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.periods.PERIOD_2,
        contractId: IDS.contracts.CONTRACT_2,
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // CONTRACT TERMS
  // =========================================================

  await prisma.contractTerm.createMany({
    data: [
      {
        id: IDS.contractTerms.CT_1,
        contractId: IDS.contracts.CONTRACT_1,
        termId: IDS.terms.TERM_1,
        createdAt: now,
      },
      {
        id: IDS.contractTerms.CT_2,
        contractId: IDS.contracts.CONTRACT_1,
        termId: IDS.terms.TERM_2,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // VIOLATION RULES
  // =========================================================

  await prisma.violationRule.createMany({
    data: [
      {
        id: IDS.violationRules.RULE_1,
        name: "Thanh toán trễ hạn",
        description: "Không thanh toán đúng thời hạn",
        targetType: "CUSTOMER",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.violationRules.RULE_2,
        name: "Gây hư hỏng tài sản",
        description: "Làm hư hỏng tài sản của nhà cung cấp",
        targetType: "CUSTOMER",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Contract seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
