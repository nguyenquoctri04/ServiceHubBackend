import { PrismaClient } from "@prisma/client-contract";
import { Prisma } from "@prisma/client-contract";

const prisma = new PrismaClient();

const IDS = {
  customer1: "30000000-0000-0000-0000-000000000002",

  roomA101: "86000000-0000-0000-0000-000000000001",

  prices: {
    RENT: "88000000-0000-0000-0000-000000000001",
    ELECTRICITY: "88000000-0000-0000-0000-000000000002",
    WATER: "88000000-0000-0000-0000-000000000003",
    INTERNET: "88000000-0000-0000-0000-000000000004",
  },

  contracts: {
    CONTRACT_1: "90000000-0000-0000-0000-000000000001",
    CONTRACT_2: "90000000-0000-0000-0000-000000000002",
  },

  terms: {
    RENT: "91000000-0000-0000-0000-000000000001",
    PAYMENT: "91000000-0000-0000-0000-000000000002",
    MAINTENANCE: "91000000-0000-0000-0000-000000000003",
  },

  periods: {
    AUGUST_2026: "92000000-0000-0000-0000-000000000001",
    SEPTEMBER_2026: "92000000-0000-0000-0000-000000000002",
  },

  template: "93000000-0000-0000-0000-000000000001",

  violationRules: {
    LATE_PAYMENT: "94000000-0000-0000-0000-000000000001",
    PROPERTY_DAMAGE: "94000000-0000-0000-0000-000000000002",
    NOISE: "94000000-0000-0000-0000-000000000003",
  },

  violationCases: {
    CASE_1: "95000000-0000-0000-0000-000000000001",
  },
};

const now = new Date();

async function main() {
  console.log("🌱 Seeding contract service...");

  // =========================
  // TEMPLATE
  // =========================

  await prisma.contractTemplate
    .create({
      data: {
        id: IDS.template,
        providerId: "40000000-0000-0000-0000-000000000001",
        name: "Standard Rental Contract",
        description: "Standard apartment rental contract.",
        content: {
          title: "HỢP ĐỒNG THUÊ PHÒNG",
          sections: [
            "Thông tin các bên",
            "Thông tin phòng",
            "Giá thuê",
            "Thanh toán",
            "Chấm dứt hợp đồng",
          ],
        },
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    })
    .catch(() => {});

  // =========================
  // TEMPLATE VARIABLES
  // =========================

  await prisma.templateVariable.createMany({
    data: [
      {
        id: "96000000-0000-0000-0000-000000000001",
        key: "customer_name",
        label: "Tên khách hàng",
        groupName: "CUSTOMER",
      },
      {
        id: "96000000-0000-0000-0000-000000000002",
        key: "room_number",
        label: "Số phòng",
        groupName: "ROOM",
      },
      {
        id: "96000000-0000-0000-0000-000000000003",
        key: "monthly_rent",
        label: "Tiền thuê hàng tháng",
        groupName: "BILLING",
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // TERMS
  // =========================

  await prisma.term.createMany({
    data: [
      {
        id: IDS.terms.RENT,
        content:
          "Khách hàng có trách nhiệm thanh toán tiền thuê đúng hạn hàng tháng.",
        status: "ACTIVE",
        createdAt: now,
      },
      {
        id: IDS.terms.PAYMENT,
        content:
          "Hóa đơn phải được thanh toán trong vòng 5 ngày kể từ ngày phát hành.",
        status: "ACTIVE",
        createdAt: now,
      },
      {
        id: IDS.terms.MAINTENANCE,
        content:
          "Khách hàng phải giữ gìn tài sản và chịu trách nhiệm đối với thiệt hại do lỗi của mình.",
        status: "ACTIVE",
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // CONTRACTS
  // =========================

  await prisma.contract.createMany({
    data: [
      {
        id: IDS.contracts.CONTRACT_1,
        contractNumber: "CTR-2026-0001",
        roomId: IDS.roomA101,
        customerId: IDS.customer1,
        startDate: new Date("2026-08-01"),
        endDate: new Date("2027-07-31"),
        status: "ACTIVE",
        requireSignature: true,
        signedAt: new Date("2026-07-30"),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.contracts.CONTRACT_2,
        contractNumber: "CTR-2026-0002",
        roomId: "86000000-0000-0000-0000-000000000003",
        customerId: "30000000-0000-0000-0000-000000000003",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-08-31"),
        status: "PENDING_SIGNATURE",
        requireSignature: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // CONTRACT SERVICES
  // =========================

  await prisma.contractService.createMany({
    data: [
      {
        id: "97000000-0000-0000-0000-000000000001",
        contractId: IDS.contracts.CONTRACT_1,
        servicePriceId: IDS.prices.RENT,
        quantity: new Prisma.Decimal("1"),
        createdAt: now,
      },
      {
        id: "97000000-0000-0000-0000-000000000002",
        contractId: IDS.contracts.CONTRACT_1,
        servicePriceId: IDS.prices.ELECTRICITY,
        quantity: new Prisma.Decimal("1"),
        createdAt: now,
      },
      {
        id: "97000000-0000-0000-0000-000000000003",
        contractId: IDS.contracts.CONTRACT_1,
        servicePriceId: IDS.prices.WATER,
        quantity: new Prisma.Decimal("1"),
        createdAt: now,
      },
      {
        id: "97000000-0000-0000-0000-000000000004",
        contractId: IDS.contracts.CONTRACT_1,
        servicePriceId: IDS.prices.INTERNET,
        quantity: new Prisma.Decimal("1"),
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // CONTRACT TERMS
  // =========================

  await prisma.contractTerm.createMany({
    data: [
      {
        id: "98000000-0000-0000-0000-000000000001",
        contractId: IDS.contracts.CONTRACT_1,
        termId: IDS.terms.RENT,
        createdAt: now,
      },
      {
        id: "98000000-0000-0000-0000-000000000002",
        contractId: IDS.contracts.CONTRACT_1,
        termId: IDS.terms.PAYMENT,
        createdAt: now,
      },
      {
        id: "98000000-0000-0000-0000-000000000003",
        contractId: IDS.contracts.CONTRACT_1,
        termId: IDS.terms.MAINTENANCE,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // BILLING PERIODS
  // =========================

  await prisma.billingPeriod.createMany({
    data: [
      {
        id: IDS.periods.AUGUST_2026,
        contractId: IDS.contracts.CONTRACT_1,
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.periods.SEPTEMBER_2026,
        contractId: IDS.contracts.CONTRACT_1,
        periodStart: new Date("2026-09-01"),
        periodEnd: new Date("2026-09-30"),
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // VIOLATION RULES
  // =========================

  await prisma.violationRule.createMany({
    data: [
      {
        id: IDS.violationRules.LATE_PAYMENT,
        name: "Late Payment",
        description: "Customer does not pay invoice on time.",
        targetType: "CUSTOMER",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.violationRules.PROPERTY_DAMAGE,
        name: "Property Damage",
        description: "Damage to property or room assets.",
        targetType: "CUSTOMER",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.violationRules.NOISE,
        name: "Noise Violation",
        description: "Excessive noise affecting other residents.",
        targetType: "CUSTOMER",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // VIOLATION CASE
  // =========================

  await prisma.violationCase
    .create({
      data: {
        id: IDS.violationCases.CASE_1,
        violationRuleId: IDS.violationRules.NOISE,
        contractId: IDS.contracts.CONTRACT_1,
        reportedBy: "40000000-0000-0000-0000-000000000001",
        serviceId: null,
        status: "RESOLVED",
        description: "Customer received a warning regarding excessive noise.",
        occurredAt: new Date("2026-08-05"),
        createdAt: now,
        updatedAt: now,
        evidence: {
          create: [
            {
              id: "99000000-0000-0000-0000-000000000001",
              fileUrl: "https://example.com/evidence/noise-report.jpg",
            },
          ],
        },
        actions: {
          create: [
            {
              id: "99000000-0000-0000-0000-000000000002",
              performedBy: "30000000-0000-0000-0000-000000000001",
              actionType: "WARNING",
              reason: "First violation.",
              createdAt: now,
            },
          ],
        },
      },
    })
    .catch(() => {});

  console.log("✅ Contract seed completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
