import { PrismaClient } from "@prisma/client-billing";

const prisma = new PrismaClient();

const now = new Date();

const providers = [
    "40000000-0000-0000-0000-000000000001",
    "40000000-0000-0000-0000-000000000002",
    "40000000-0000-0000-0000-000000000003",
    "40000000-0000-0000-0000-000000000004",
];
const customers = [
    "30000000-0000-0000-0000-000000000002",
    "30000000-0000-0000-0000-000000000003",
    "30000000-0000-0000-0000-000000000004",
    "30000000-0000-0000-0000-000000000008",
];
const service = (n: number) =>
    `61000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const contract = (n: number) =>
    `70000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const period = (n: number) =>
    `71000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const meter = (n: number) =>
    `80000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const reading = (n: number) =>
    `81000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const usage = (n: number) =>
    `82000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const invoice = (n: number) =>
    `83000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const item = (n: number) =>
    `84000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const payment = (n: number) =>
    `85000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

async function main() {
    const meters = Array.from({ length: 30 }, (_, i) => ({
        id: meter(i + 1),
        providerId: providers[i % providers.length],
        serviceId: service(1 + (i % 60)),
        name: ["Điện", "Nước", "Gas"][i % 3],
        unit: ["kWh", "m³", "kg"][i % 3],
        status: "ACTIVE" as const,
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.meter.createMany({ data: meters, skipDuplicates: true });

    await prisma.meterReading.createMany({
        data: Array.from({ length: 240 }, (_, i) => ({
            id: reading(i + 1),
            roomId: `6b000000-0000-0000-0000-${String((i % 300) + 1).padStart(12, "0")}`,
            contractId: contract((i % 36) + 1),
            meterId: meter((i % 30) + 1),
            recordedBy: "30000000-0000-0000-0000-000000000001",
            value: String(50 + (i % 200) + i / 10),
            imgUrl: `https://example.com/chi-so/${i + 1}.jpg`,
            source:
                i % 5 === 0
                    ? ("IMAGE" as const)
                    : i % 7 === 0
                      ? ("EXCEL_IMPORT" as const)
                      : ("MANUAL" as const),
            status: i % 19 === 0 ? ("VOID" as const) : ("VALID" as const),
            createdAt: new Date(
                `2026-${String((i % 6) + 1).padStart(2, "0")}-01`,
            ),
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.serviceUsage.createMany({
        data: Array.from({ length: 120 }, (_, i) => ({
            id: usage(i + 1),
            billingPeriodId: period((i % 108) + 1),
            startReadingId: reading(i * 2 + 1),
            endReadingId: reading(i * 2 + 2),
            createdAt: now,
        })),
        skipDuplicates: true,
    });

    const invoices = Array.from({ length: 108 }, (_, i) => ({
        id: invoice(i + 1),
        invoiceNumber: `HDN-2026-${String(i + 1).padStart(5, "0")}`,
        customerId: customers[i % customers.length],
        contractId: contract((i % 36) + 1),
        billingPeriodId: period(i + 1),
        providerId: providers[i % providers.length],
        total: String(900000 + (i % 10) * 125000),
        status:
            i % 5 === 0
                ? ("PAID" as const)
                : i % 7 === 0
                  ? ("OVERDUE" as const)
                  : ("UNPAID" as const),
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.invoice.createMany({ data: invoices, skipDuplicates: true });

    await prisma.invoiceItem.createMany({
        data: Array.from({ length: 324 }, (_, i) => ({
            id: item(i + 1),
            invoiceId: invoice((i % 108) + 1),
            servicePriceId: `62000000-0000-0000-0000-${String((i % 120) + 1).padStart(12, "0")}`,
            quantity: String((i % 4) + 1),
            unit: i % 3 === 0 ? "tháng" : "lần",
            unitPrice: String(100000 + (i % 15) * 25000),
            amount: String(((i % 4) + 1) * (100000 + (i % 15) * 25000)),
            createdAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.payment.createMany({
        data: Array.from({ length: 108 }, (_, i) => ({
            id: payment(i + 1),
            invoiceId: invoice(i + 1),
            paymentMethod: i % 2 === 0 ? ("CARD" as const) : ("CASH" as const),
            paymentLinkId: i % 5 === 0 ? `LIEN-KET-${i + 1}` : null,
            status:
                i % 5 === 0
                    ? ("SUCCESS" as const)
                    : i % 7 === 0
                      ? ("FAILED" as const)
                      : ("PENDING" as const),
            paidAt: i % 5 === 0 ? now : null,
            createdAt: now,
        })),
        skipDuplicates: true,
    });

    console.log("Đã seed billing-service.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
