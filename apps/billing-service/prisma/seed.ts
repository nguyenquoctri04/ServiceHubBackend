import { PrismaClient } from "@prisma/client-billing";
import { Prisma } from "@prisma/client-billing";

const prisma = new PrismaClient();

const IDS = {
  provider1: "40000000-0000-0000-0000-000000000001",
  customer1: "30000000-0000-0000-0000-000000000002",

  contract1: "90000000-0000-0000-0000-000000000001",
  billingPeriod1: "92000000-0000-0000-0000-000000000001",

  prices: {
    RENT: "88000000-0000-0000-0000-000000000001",
    ELECTRICITY: "88000000-0000-0000-0000-000000000002",
    WATER: "88000000-0000-0000-0000-000000000003",
    INTERNET: "88000000-0000-0000-0000-000000000004",
  },

  meters: {
    ELECTRICITY: "a0000000-0000-0000-0000-000000000001",
    WATER: "a0000000-0000-0000-0000-000000000002",
  },

  readings: {
    ELECTRICITY_START: "a1000000-0000-0000-0000-000000000001",
    ELECTRICITY_END: "a1000000-0000-0000-0000-000000000002",
    WATER_START: "a1000000-0000-0000-0000-000000000003",
    WATER_END: "a1000000-0000-0000-0000-000000000004",
  },

  usage: {
    ELECTRICITY: "a2000000-0000-0000-0000-000000000001",
    WATER: "a2000000-0000-0000-0000-000000000002",
  },

  invoice: "a3000000-0000-0000-0000-000000000001",

  items: {
    RENT: "a4000000-0000-0000-0000-000000000001",
    ELECTRICITY: "a4000000-0000-0000-0000-000000000002",
    WATER: "a4000000-0000-0000-0000-000000000003",
    INTERNET: "a4000000-0000-0000-0000-000000000004",
  },

  payment: "a5000000-0000-0000-0000-000000000001",
};

const now = new Date();

async function main() {
  console.log("🌱 Seeding billing service...");

  // =========================
  // METERS
  // =========================

  await prisma.meter.createMany({
    data: [
      {
        id: IDS.meters.ELECTRICITY,
        serviceId: "87000000-0000-0000-0000-000000000002",
        name: "Electricity Meter",
        unit: "KWH",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.meters.WATER,
        serviceId: "87000000-0000-0000-0000-000000000003",
        name: "Water Meter",
        unit: "M3",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // METER READINGS
  // =========================

  await prisma.meterReading.createMany({
    data: [
      {
        id: IDS.readings.ELECTRICITY_START,
        roomId: "86000000-0000-0000-0000-000000000001",
        contractId: IDS.contract1,
        meterId: IDS.meters.ELECTRICITY,
        recordedBy: IDS.provider1,
        value: new Prisma.Decimal("1200"),
        imgUrl: "https://example.com/meters/electricity-start.jpg",
        source: "IMAGE",
        status: "VALID",
        createdAt: new Date("2026-08-01"),
        updatedAt: new Date("2026-08-01"),
      },
      {
        id: IDS.readings.ELECTRICITY_END,
        roomId: "86000000-0000-0000-0000-000000000001",
        contractId: IDS.contract1,
        meterId: IDS.meters.ELECTRICITY,
        recordedBy: IDS.provider1,
        value: new Prisma.Decimal("1350"),
        imgUrl: "https://example.com/meters/electricity-end.jpg",
        source: "IMAGE",
        status: "VALID",
        createdAt: new Date("2026-08-31"),
        updatedAt: new Date("2026-08-31"),
      },
      {
        id: IDS.readings.WATER_START,
        roomId: "86000000-0000-0000-0000-000000000001",
        contractId: IDS.contract1,
        meterId: IDS.meters.WATER,
        recordedBy: IDS.provider1,
        value: new Prisma.Decimal("300"),
        imgUrl: "https://example.com/meters/water-start.jpg",
        source: "IMAGE",
        status: "VALID",
        createdAt: new Date("2026-08-01"),
        updatedAt: new Date("2026-08-01"),
      },
      {
        id: IDS.readings.WATER_END,
        roomId: "86000000-0000-0000-0000-000000000001",
        contractId: IDS.contract1,
        meterId: IDS.meters.WATER,
        recordedBy: IDS.provider1,
        value: new Prisma.Decimal("312"),
        imgUrl: "https://example.com/meters/water-end.jpg",
        source: "IMAGE",
        status: "VALID",
        createdAt: new Date("2026-08-31"),
        updatedAt: new Date("2026-08-31"),
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // SERVICE USAGE
  // =========================

  await prisma.serviceUsage.createMany({
    data: [
      {
        id: IDS.usage.ELECTRICITY,
        billingPeriodId: IDS.billingPeriod1,
        startReadingId: IDS.readings.ELECTRICITY_START,
        endReadingId: IDS.readings.ELECTRICITY_END,
        createdAt: now,
      },
      {
        id: IDS.usage.WATER,
        billingPeriodId: IDS.billingPeriod1,
        startReadingId: IDS.readings.WATER_START,
        endReadingId: IDS.readings.WATER_END,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // INVOICE
  // =========================

  await prisma.invoice
    .create({
      data: {
        id: IDS.invoice,
        invoiceNumber: "INV-2026-0001",
        customerId: IDS.customer1,
        contractId: IDS.contract1,
        billingPeriodId: IDS.billingPeriod1,

        total: new Prisma.Decimal("6036000"),

        status: "UNPAID",

        createdAt: now,
        updatedAt: now,
      },
    })
    .catch(() => {});

  // =========================
  // INVOICE ITEMS
  // =========================

  await prisma.invoiceItem.createMany({
    data: [
      {
        id: IDS.items.RENT,
        invoiceId: IDS.invoice,
        servicePriceId: IDS.prices.RENT,
        quantity: new Prisma.Decimal("1"),
        unit: "MONTH",
        unitPrice: new Prisma.Decimal("5000000"),
        amount: new Prisma.Decimal("5000000"),
        createdAt: now,
      },
      {
        id: IDS.items.ELECTRICITY,
        invoiceId: IDS.invoice,
        servicePriceId: IDS.prices.ELECTRICITY,
        quantity: new Prisma.Decimal("150"),
        unit: "KWH",
        unitPrice: new Prisma.Decimal("3500"),
        amount: new Prisma.Decimal("525000"),
        createdAt: now,
      },
      {
        id: IDS.items.WATER,
        invoiceId: IDS.invoice,
        servicePriceId: IDS.prices.WATER,
        quantity: new Prisma.Decimal("12"),
        unit: "M3",
        unitPrice: new Prisma.Decimal("18000"),
        amount: new Prisma.Decimal("216000"),
        createdAt: now,
      },
      {
        id: IDS.items.INTERNET,
        invoiceId: IDS.invoice,
        servicePriceId: IDS.prices.INTERNET,
        quantity: new Prisma.Decimal("1"),
        unit: "MONTH",
        unitPrice: new Prisma.Decimal("250000"),
        amount: new Prisma.Decimal("250000"),
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // PAYMENT
  // =========================

  await prisma.payment
    .create({
      data: {
        id: IDS.payment,
        invoiceId: IDS.invoice,
        paymentMethod: "CARD",
        paymentLinkId: "PAYLINK-2026-0001",
        status: "PENDING",
        createdAt: now,
      },
    })
    .catch(() => {});

  console.log("✅ Billing seed completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
