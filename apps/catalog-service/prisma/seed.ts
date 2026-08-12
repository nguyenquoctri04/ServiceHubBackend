import { PrismaClient } from "@prisma/client-catalog";
import { Prisma } from "@prisma/client-catalog";

const prisma = new PrismaClient();

const IDS = {
  provider1: "40000000-0000-0000-0000-000000000001",
  provider2: "40000000-0000-0000-0000-000000000002",

  categories: {
    RENTAL: "80000000-0000-0000-0000-000000000001",
    ELECTRICITY: "80000000-0000-0000-0000-000000000002",
    WATER: "80000000-0000-0000-0000-000000000003",
    INTERNET: "80000000-0000-0000-0000-000000000004",
    CLEANING: "80000000-0000-0000-0000-000000000005",
  },

  billingRules: {
    MONTHLY_FIXED: "81000000-0000-0000-0000-000000000001",
    MONTHLY_METERED: "81000000-0000-0000-0000-000000000002",
    ONE_TIME: "81000000-0000-0000-0000-000000000003",
  },

  properties: {
    SUNRISE: "82000000-0000-0000-0000-000000000001",
  },

  blocks: {
    A: "83000000-0000-0000-0000-000000000001",
    B: "83000000-0000-0000-0000-000000000002",
  },

  floors: {
    A1: "84000000-0000-0000-0000-000000000001",
    A2: "84000000-0000-0000-0000-000000000002",
    B1: "84000000-0000-0000-0000-000000000003",
  },

  roomTypes: {
    STUDIO: "85000000-0000-0000-0000-000000000001",
    ONE_BEDROOM: "85000000-0000-0000-0000-000000000002",
  },

  rooms: {
    A101: "86000000-0000-0000-0000-000000000001",
    A102: "86000000-0000-0000-0000-000000000002",
    A201: "86000000-0000-0000-0000-000000000003",
    B101: "86000000-0000-0000-0000-000000000004",
  },

  services: {
    RENT_STUDIO: "87000000-0000-0000-0000-000000000001",
    ELECTRICITY: "87000000-0000-0000-0000-000000000002",
    WATER: "87000000-0000-0000-0000-000000000003",
    INTERNET: "87000000-0000-0000-0000-000000000004",
    CLEANING: "87000000-0000-0000-0000-000000000005",
  },

  prices: {
    RENT_STUDIO: "88000000-0000-0000-0000-000000000001",
    ELECTRICITY: "88000000-0000-0000-0000-000000000002",
    WATER: "88000000-0000-0000-0000-000000000003",
    INTERNET: "88000000-0000-0000-0000-000000000004",
    CLEANING: "88000000-0000-0000-0000-000000000005",
  },
};

const now = new Date();

async function main() {
  console.log("🌱 Seeding catalog service...");

  // =========================
  // CATEGORIES
  // =========================

  await prisma.category.createMany({
    data: [
      {
        id: IDS.categories.RENTAL,
        name: "Phòng cho thuê",
        description: "Dịch vụ phòng và căn hộ cho thuê",
      },
      {
        id: IDS.categories.ELECTRICITY,
        name: "Điện",
        description: "Dịch vụ điện theo mức tiêu thụ",
      },
      {
        id: IDS.categories.WATER,
        name: "Nước",
        description: "Dịch vụ nước theo mức tiêu thụ",
      },
      {
        id: IDS.categories.INTERNET,
        name: "Internet",
        description: "Dịch vụ Internet",
      },
      {
        id: IDS.categories.CLEANING,
        name: "Vệ sinh",
        description: "Dịch vụ vệ sinh phòng",
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // BILLING RULES
  // =========================

  await prisma.serviceBillingRule.createMany({
    data: [
      {
        id: IDS.billingRules.MONTHLY_FIXED,
        calculationMethod: "FIXED",
        billingFrequency: "RECURRING",
        billingIntervalValue: 1,
        billingIntervalUnit: "MONTH",
        prorationMethod: "DAILY",
        usageSource: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.billingRules.MONTHLY_METERED,
        calculationMethod: "METERED",
        billingFrequency: "RECURRING",
        billingIntervalValue: 1,
        billingIntervalUnit: "MONTH",
        prorationMethod: "NONE",
        usageSource: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.billingRules.ONE_TIME,
        calculationMethod: "FIXED",
        billingFrequency: "ONE_TIME",
        billingIntervalValue: 1,
        billingIntervalUnit: "MONTH",
        prorationMethod: "NONE",
        usageSource: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // PROPERTY
  // =========================

  await prisma.property.createMany({
    data: [
      {
        id: IDS.properties.SUNRISE,
        providerId: IDS.provider1,
        propertyName: "Sunrise Residence",
        description: "Modern apartment building in Ho Chi Minh City.",
        address: "123 Nguyen Van Linh, District 7, Ho Chi Minh City",
        latitude: new Prisma.Decimal("10.729800"),
        longitude: new Prisma.Decimal("106.721500"),
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // BLOCKS
  // =========================

  await prisma.block.createMany({
    data: [
      {
        id: IDS.blocks.A,
        propertyId: IDS.properties.SUNRISE,
        blockName: "Block A",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.blocks.B,
        propertyId: IDS.properties.SUNRISE,
        blockName: "Block B",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // FLOORS
  // =========================

  await prisma.floor.createMany({
    data: [
      {
        id: IDS.floors.A1,
        blockId: IDS.blocks.A,
        floorName: "Floor 1",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.floors.A2,
        blockId: IDS.blocks.A,
        floorName: "Floor 2",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.floors.B1,
        blockId: IDS.blocks.B,
        floorName: "Floor 1",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // ROOM TYPES
  // =========================

  await prisma.roomType.createMany({
    data: [
      {
        id: IDS.roomTypes.STUDIO,
        propertyId: IDS.properties.SUNRISE,
        typeName: "Studio",
        area: new Prisma.Decimal("25.00"),
        maxOccupancy: 2,
        description: "Studio room with private bathroom.",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.roomTypes.ONE_BEDROOM,
        propertyId: IDS.properties.SUNRISE,
        typeName: "1 Bedroom",
        area: new Prisma.Decimal("40.00"),
        maxOccupancy: 3,
        description: "One-bedroom apartment.",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // ROOMS
  // =========================

  await prisma.room.createMany({
    data: [
      {
        id: IDS.rooms.A101,
        roomTypeId: IDS.roomTypes.STUDIO,
        floorId: IDS.floors.A1,
        roomNumber: "A101",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.rooms.A102,
        roomTypeId: IDS.roomTypes.STUDIO,
        floorId: IDS.floors.A1,
        roomNumber: "A102",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.rooms.A201,
        roomTypeId: IDS.roomTypes.ONE_BEDROOM,
        floorId: IDS.floors.A2,
        roomNumber: "A201",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.rooms.B101,
        roomTypeId: IDS.roomTypes.ONE_BEDROOM,
        floorId: IDS.floors.B1,
        roomNumber: "B101",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // SERVICES
  // =========================

  await prisma.service.createMany({
    data: [
      {
        id: IDS.services.RENT_STUDIO,
        name: "Studio Room Rental",
        description: "Monthly studio room rental.",
        status: "ACTIVE",
        address: "123 Nguyen Van Linh, District 7, Ho Chi Minh City",
        latitude: new Prisma.Decimal("10.729800"),
        longitude: new Prisma.Decimal("106.721500"),
        requiresPrepayment: true,
        requiresContract: true,
        providerId: IDS.provider1,
        categoryId: IDS.categories.RENTAL,
        billingRuleId: IDS.billingRules.MONTHLY_FIXED,
        serviceType: "NORMAL",
        roomTypeId: IDS.roomTypes.STUDIO,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.services.ELECTRICITY,
        name: "Electricity",
        description: "Electricity usage billing.",
        status: "ACTIVE",
        address: "123 Nguyen Van Linh, District 7, Ho Chi Minh City",
        latitude: new Prisma.Decimal("10.729800"),
        longitude: new Prisma.Decimal("106.721500"),
        requiresPrepayment: false,
        requiresContract: true,
        providerId: IDS.provider1,
        categoryId: IDS.categories.ELECTRICITY,
        billingRuleId: IDS.billingRules.MONTHLY_METERED,
        serviceType: "ADDITION",
        roomTypeId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.services.WATER,
        name: "Water",
        description: "Water usage billing.",
        status: "ACTIVE",
        address: "123 Nguyen Van Linh, District 7, Ho Chi Minh City",
        latitude: new Prisma.Decimal("10.729800"),
        longitude: new Prisma.Decimal("106.721500"),
        requiresPrepayment: false,
        requiresContract: true,
        providerId: IDS.provider1,
        categoryId: IDS.categories.WATER,
        billingRuleId: IDS.billingRules.MONTHLY_METERED,
        serviceType: "ADDITION",
        roomTypeId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.services.INTERNET,
        name: "Internet 300 Mbps",
        description: "High-speed Internet service.",
        status: "ACTIVE",
        address: "123 Nguyen Van Linh, District 7, Ho Chi Minh City",
        latitude: new Prisma.Decimal("10.729800"),
        longitude: new Prisma.Decimal("106.721500"),
        requiresPrepayment: false,
        requiresContract: true,
        providerId: IDS.provider2,
        categoryId: IDS.categories.INTERNET,
        billingRuleId: IDS.billingRules.MONTHLY_FIXED,
        serviceType: "ADDITION",
        roomTypeId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.services.CLEANING,
        name: "Room Cleaning",
        description: "One-time room cleaning service.",
        status: "ACTIVE",
        address: "123 Nguyen Van Linh, District 7, Ho Chi Minh City",
        latitude: new Prisma.Decimal("10.729800"),
        longitude: new Prisma.Decimal("106.721500"),
        requiresPrepayment: false,
        requiresContract: false,
        providerId: IDS.provider2,
        categoryId: IDS.categories.CLEANING,
        billingRuleId: IDS.billingRules.ONE_TIME,
        serviceType: "ADDITION",
        roomTypeId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // PRICES
  // =========================

  await prisma.servicePrice.createMany({
    data: [
      {
        id: IDS.prices.RENT_STUDIO,
        createdBy: "30000000-0000-0000-0000-000000000005",
        serviceId: IDS.services.RENT_STUDIO,
        price: new Prisma.Decimal("5000000"),
        unit: "MONTH",
        effectiveFrom: new Date("2026-01-01"),
        createdAt: now,
      },
      {
        id: IDS.prices.ELECTRICITY,
        createdBy: IDS.provider1,
        serviceId: IDS.services.ELECTRICITY,
        price: new Prisma.Decimal("3500"),
        unit: "KWH",
        effectiveFrom: new Date("2026-01-01"),
        createdAt: now,
      },
      {
        id: IDS.prices.WATER,
        createdBy: IDS.provider1,
        serviceId: IDS.services.WATER,
        price: new Prisma.Decimal("18000"),
        unit: "M3",
        effectiveFrom: new Date("2026-01-01"),
        createdAt: now,
      },
      {
        id: IDS.prices.INTERNET,
        createdBy: IDS.provider2,
        serviceId: IDS.services.INTERNET,
        price: new Prisma.Decimal("250000"),
        unit: "MONTH",
        effectiveFrom: new Date("2026-01-01"),
        createdAt: now,
      },
      {
        id: IDS.prices.CLEANING,
        createdBy: IDS.provider2,
        serviceId: IDS.services.CLEANING,
        price: new Prisma.Decimal("150000"),
        unit: "SERVICE",
        effectiveFrom: new Date("2026-01-01"),
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // BILLING SCHEDULE
  // =========================

  await prisma.billingSchedule.createMany({
    data: [
      {
        id: "89000000-0000-0000-0000-000000000001",
        serviceId: IDS.services.RENT_STUDIO,
        billingDay: 1,
        dueDays: 5,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "89000000-0000-0000-0000-000000000002",
        serviceId: IDS.services.ELECTRICITY,
        billingDay: 1,
        dueDays: 5,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "89000000-0000-0000-0000-000000000003",
        serviceId: IDS.services.WATER,
        billingDay: 1,
        dueDays: 5,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "89000000-0000-0000-0000-000000000004",
        serviceId: IDS.services.INTERNET,
        billingDay: 1,
        dueDays: 5,
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Catalog seed completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
