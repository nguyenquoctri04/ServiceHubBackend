import { PrismaClient } from "@prisma/client-billing";

const prisma = new PrismaClient();

const IDS = {
  meters: {
    ELECTRIC: "80000000-0000-0000-0000-000000000001",
    WATER: "80000000-0000-0000-0000-000000000002",
  },

  readings: {
    ELECTRIC_START: "81000000-0000-0000-0000-000000000001",
    ELECTRIC_END: "81000000-0000-0000-0000-000000000002",
    WATER_START: "81000000-0000-0000-0000-000000000003",
    WATER_END: "81000000-0000-0000-0000-000000000004",
  },

  usages: {
    ELECTRIC: "82000000-0000-0000-0000-000000000001",
    WATER: "82000000-0000-0000-0000-000000000002",
  },

  invoices: {
    INVOICE_1: "83000000-0000-0000-0000-000000000001",
    INVOICE_2: "83000000-0000-0000-0000-000000000002",
  },

  invoiceItems: {
    ITEM_1: "84000000-0000-0000-0000-000000000001",
    ITEM_2: "84000000-0000-0000-0000-000000000002",
    ITEM_3: "84000000-0000-0000-0000-000000000003",
  },

  payments: {
    PAYMENT_1: "85000000-0000-0000-0000-000000000001",
  },
};

const USERS = {
  CUSTOMER: "30000000-0000-0000-0000-000000000008",
  PROVIDER: "30000000-0000-0000-0000-000000000009",
};

const CONTRACTS = {
  CONTRACT_1: "70000000-0000-0000-0000-000000000001",
  PERIOD_1: "72000000-0000-0000-0000-000000000001",
  ROOM_101: "66000000-0000-0000-0000-000000000001",
};

const CATALOG = {
  ELECTRIC: "62000000-0000-0000-0000-000000000005",
  WATER: "62000000-0000-0000-0000-000000000006",
  ROOM_RENT: "63000000-0000-0000-0000-000000000001",
  CLEANING: "63000000-0000-0000-0000-000000000002",
};

async function main() {
  console.log("🌱 Seeding billing service...");

  const now = new Date();

  // =========================================================
  // METERS
  // =========================================================

  await prisma.meter.createMany({
    data: [
      {
        id: IDS.meters.ELECTRIC,
        serviceId: CATALOG.ELECTRIC,
        name: "Điện",
        unit: "kWh",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.meters.WATER,
        serviceId: CATALOG.WATER,
        name: "Nước",
        unit: "m3",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // METER READINGS
  // =========================================================

  await prisma.meterReading.createMany({
    data: [
      {
        id: IDS.readings.ELECTRIC_START,
        roomId: CONTRACTS.ROOM_101,
        contractId: CONTRACTS.CONTRACT_1,
        meterId: IDS.meters.ELECTRIC,
        recordedBy: USERS.PROVIDER,
        value: 1200,
        source: "MANUAL",
        status: "VALID",
        createdAt: new Date("2026-08-01"),
        updatedAt: new Date("2026-08-01"),
      },
      {
        id: IDS.readings.ELECTRIC_END,
        roomId: CONTRACTS.ROOM_101,
        contractId: CONTRACTS.CONTRACT_1,
        meterId: IDS.meters.ELECTRIC,
        recordedBy: USERS.PROVIDER,
        value: 1350,
        source: "IMAGE",
        imgUrl: "https://placehold.co/800x600?text=Electric+Meter",
        status: "VALID",
        createdAt: new Date("2026-08-31"),
        updatedAt: new Date("2026-08-31"),
      },
      {
        id: IDS.readings.WATER_START,
        roomId: CONTRACTS.ROOM_101,
        contractId: CONTRACTS.CONTRACT_1,
        meterId: IDS.meters.WATER,
        recordedBy: USERS.PROVIDER,
        value: 100,
        source: "MANUAL",
        status: "VALID",
        createdAt: new Date("2026-08-01"),
        updatedAt: new Date("2026-08-01"),
      },
      {
        id: IDS.readings.WATER_END,
        roomId: CONTRACTS.ROOM_101,
        contractId: CONTRACTS.CONTRACT_1,
        meterId: IDS.meters.WATER,
        recordedBy: USERS.PROVIDER,
        value: 112,
        source: "IMAGE",
        imgUrl: "https://placehold.co/800x600?text=Water+Meter",
        status: "VALID",
        createdAt: new Date("2026-08-31"),
        updatedAt: new Date("2026-08-31"),
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // SERVICE USAGE
  // =========================================================

  await prisma.serviceUsage.createMany({
    data: [
      {
        id: IDS.usages.ELECTRIC,
        billingPeriodId: CONTRACTS.PERIOD_1,
        startReadingId: IDS.readings.ELECTRIC_START,
        endReadingId: IDS.readings.ELECTRIC_END,
        createdAt: now,
      },
      {
        id: IDS.usages.WATER,
        billingPeriodId: CONTRACTS.PERIOD_1,
        startReadingId: IDS.readings.WATER_START,
        endReadingId: IDS.readings.WATER_END,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // INVOICES
  // =========================================================

  await prisma.invoice.createMany({
    data: [
      {
        id: IDS.invoices.INVOICE_1,
        invoiceNumber: "INV-2026-0001",
        customerId: USERS.CUSTOMER,
        contractId: CONTRACTS.CONTRACT_1,
        billingPeriodId: CONTRACTS.PERIOD_1,
        total: 5750000,
        status: "UNPAID",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.invoices.INVOICE_2,
        invoiceNumber: "INV-2026-0002",
        customerId: "30000000-0000-0000-0000-000000000002",
        contractId: "70000000-0000-0000-0000-000000000002",
        billingPeriodId: "72000000-0000-0000-0000-000000000002",
        total: 5000000,
        status: "PAID",
        createdAt: now,
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // INVOICE ITEMS
  // =========================================================

  await prisma.invoiceItem.createMany({
    data: [
      {
        id: IDS.invoiceItems.ITEM_1,
        invoiceId: IDS.invoices.INVOICE_1,
        servicePriceId: CATALOG.ROOM_RENT,
        quantity: 1,
        unit: "MONTH",
        unitPrice: 5000000,
        amount: 5000000,
        createdAt: now,
      },
      {
        id: IDS.invoiceItems.ITEM_2,
        invoiceId: IDS.invoices.INVOICE_1,
        servicePriceId: CATALOG.CLEANING,
        quantity: 2,
        unit: "HOUR",
        unitPrice: 80000,
        amount: 160000,
        createdAt: now,
      },
      {
        id: IDS.invoiceItems.ITEM_3,
        invoiceId: IDS.invoices.INVOICE_1,
        servicePriceId: null,
        quantity: 150,
        unit: "kWh",
        unitPrice: 3933.33,
        amount: 590000,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // =========================================================
  // PAYMENT
  // =========================================================

  await prisma.payment.createMany({
    data: [
      {
        id: IDS.payments.PAYMENT_1,
        invoiceId: IDS.invoices.INVOICE_2,
        paymentMethod: "CARD",
        paymentLinkId: "PAYLINK-2026-0001",
        status: "SUCCESS",
        paidAt: now,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Billing seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
