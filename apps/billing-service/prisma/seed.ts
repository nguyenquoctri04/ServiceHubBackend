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
    ...Array.from({ length: 12 }, (_, i) => `30000000-0000-0000-0000-${String(i + 15).padStart(12, "0")}`),
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
const firstBillingMonthForContract = (contractNumber: number) =>
    [3, 4, 6].includes((contractNumber - 1) % 7)
        ? 1
        : ((contractNumber - 1) % 6) + 1;
const isOneTimeContract = (contractNumber: number) => (contractNumber - 1) % 4 === 0;
const recurringContracts = Array.from({ length: 36 }, (_, i) => i + 1).filter(
    (contractNumber) => !isOneTimeContract(contractNumber),
);
const quantityForContract = (contractNumber: number) => ((contractNumber - 1) % 3) + 1;
const unitPriceForContract = (contractNumber: number) =>
    80000 + (((contractNumber - 1) % 4) * 25000);
const totalForContract = (contractNumber: number) =>
    unitPriceForContract(contractNumber) * quantityForContract(contractNumber);

async function main() {
    const meters = Array.from({ length: 30 }, (_, i) => ({
        id: meter(i + 1),
        providerId: providers[0],
        serviceId: service(59 + (i % 3)),
        name: ["Điện", "Nước", "Gas"][i % 3],
        unit: ["kWh", "m³", "kg"][i % 3],
        status: "ACTIVE" as const,
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.meter.createMany({ data: meters, skipDuplicates: true });

    await prisma.meterReading.createMany({
        data: Array.from({ length: 240 }, (_, i) => {
            const pairIndex = Math.floor(i / 2);
            const contractNumber = recurringContracts[pairIndex % recurringContracts.length];
            const monthIndex = Math.floor(pairIndex / recurringContracts.length) % 3;
            const month = firstBillingMonthForContract(contractNumber) + monthIndex;
            return {
            id: reading(i + 1),
            roomId: `6b000000-0000-0000-0000-${String(contractNumber).padStart(12, "0")}`,
            contractId: contract(contractNumber),
            meterId: meter((pairIndex % 30) + 1),
            recordedBy: "30000000-0000-0000-0000-000000000001",
            value: String(100 + Math.floor(i / 2) * 12 + (i % 2) * 5),
            imgUrl: `https://example.com/chi-so/${i + 1}.jpg`,
            source:
                i % 5 === 0
                    ? ("IMAGE" as const)
                    : i % 7 === 0
                      ? ("EXCEL_IMPORT" as const)
                      : ("MANUAL" as const),
            status: Math.floor(i / 2) % 17 === 0 ? ("VOID" as const) : ("VALID" as const),
            createdAt: new Date(Date.UTC(2026, month - 1, i % 2 === 0 ? 1 : 28)),
            updatedAt: now,
            };
        }),
        skipDuplicates: true,
    });

    const validUsagePairs = Array.from({ length: 120 }, (_, i) => i).filter((i) => i % 17 !== 0);
    await prisma.serviceUsage.createMany({
        data: validUsagePairs.map((pairIndex, i) => {
            const contractNumber = recurringContracts[pairIndex % recurringContracts.length];
            const monthIndex = Math.floor(pairIndex / recurringContracts.length) % 3;
            const billingPeriodNumber = (contractNumber - 1) * 3 + monthIndex + 1;
            return {
                id: usage(i + 1),
                billingPeriodId: period(billingPeriodNumber),
                startReadingId: reading(pairIndex * 2 + 1),
                endReadingId: reading(pairIndex * 2 + 2),
                createdAt: now,
            };
        }),
        skipDuplicates: true,
    });

    const invoiceRows: Array<{
        id: string;
        invoiceNumber: string;
        customerId: string;
        contractId: string;
        billingPeriodId: string | null;
        providerId: string;
        total: string;
        status: "PAID" | "OVERDUE" | "UNPAID";
        createdAt: Date;
        updatedAt: Date;
    }> = [];

    for (const contractNumber of recurringContracts) {
        for (let monthIndex = 0; monthIndex < 3; monthIndex++) {
            const sequence = invoiceRows.length;
            const status = sequence % 5 === 0
                ? "PAID"
                : sequence % 7 === 0
                  ? "OVERDUE"
                  : "UNPAID";
            invoiceRows.push({
                id: invoice(sequence + 1),
                invoiceNumber: `HDN-2026-${String(sequence + 1).padStart(5, "0")}`,
                customerId: customers[(contractNumber - 1) % customers.length],
                contractId: contract(contractNumber),
                billingPeriodId: period((contractNumber - 1) * 3 + monthIndex + 1),
                providerId: providers[(contractNumber - 1) % providers.length],
                total: String(totalForContract(contractNumber)),
                status,
                createdAt: now,
                updatedAt: now,
            });
        }
    }

    for (const contractNumber of [1, 9, 17, 25, 33]) {
        const sequence = invoiceRows.length;
        const paid = contractNumber === 25 || contractNumber === 33;
        invoiceRows.push({
            id: invoice(sequence + 1),
            invoiceNumber: `HDN-PRE-2026-${String(contractNumber).padStart(4, "0")}`,
            customerId: customers[(contractNumber - 1) % customers.length],
            contractId: contract(contractNumber),
            billingPeriodId: null,
            providerId: providers[(contractNumber - 1) % providers.length],
            total: String(totalForContract(contractNumber)),
            status: paid ? "PAID" : "UNPAID",
            createdAt: now,
            updatedAt: now,
        });
    }
    const invoices = invoiceRows;
    await prisma.invoice.createMany({ data: invoices, skipDuplicates: true });

    await prisma.invoiceItem.createMany({
        data: invoices.map((row, i) => ({
            id: item(i + 1),
            invoiceId: row.id,
            servicePriceId: `62000000-0000-0000-0000-${String((((Number(row.contractId.slice(-12)) - 1) % 4) * 2) + 1).padStart(12, "0")}`,
            quantity: String(quantityForContract(Number(row.contractId.slice(-12)))),
            unit: "tháng",
            unitPrice: String(unitPriceForContract(Number(row.contractId.slice(-12)))),
            amount: row.total,
            createdAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.payment.createMany({
        data: Array.from({ length: invoices.length }, (_, i) => ({
            id: payment(i + 1),
            invoiceId: invoices[i].id,
            paymentMethod: i % 2 === 0 ? ("CARD" as const) : ("CASH" as const),
            paymentLinkId: i % 5 === 0 ? `LIEN-KET-${i + 1}` : null,
            status:
                invoices[i].status === "PAID"
                    ? ("SUCCESS" as const)
                    : invoices[i].status === "OVERDUE"
                      ? ("FAILED" as const)
                      : ("PENDING" as const),
            paidAt: invoices[i].status === "PAID" ? now : null,
            createdAt: now,
        })),
        skipDuplicates: true,
    });

    console.log("Đã seed billing-service.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
