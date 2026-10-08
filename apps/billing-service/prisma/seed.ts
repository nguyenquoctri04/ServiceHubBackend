import { InvoiceStatus, PrismaClient } from "@prisma/client-billing";

const prisma = new PrismaClient();

const meterId = (n: number) => `80000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const readingId = (n: number) => `81000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const usageId = (n: number) => `82000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const invoiceId = (n: number) => `83000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const invoiceItemId = (n: number) => `84000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const paymentId = (n: number) => `85000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const contractId = (n: number) => `70000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const periodId = (n: number) => `71000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const roomId = (n: number) => `6b000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const serviceId = (n: number) => `61000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const servicePriceId = (n: number) => `62000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const providerId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const now = new Date();

async function main() {
    // 1. CLEAR OLD DEV SEEDS
    await prisma.payment.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.serviceUsage.deleteMany();
    await prisma.meterReading.deleteMany();
    await prisma.meter.deleteMany();

    // Housing providers: 7, 2, 3, 12, 13, 16
    const housingProviders = [7, 2, 3, 12, 13, 16];

    // 2. METERS
    const meters = [];
    for (let i = 0; i < 30; i++) {
        const prov = housingProviders[i % housingProviders.length];
        // Electricity
        meters.push({ id: meterId(i * 2 + 1), providerId: providerId(prov), serviceId: serviceId(i * 3 + 2), name: `Điện sinh hoạt BĐS ${i+1}`, unit: "kWh", status: "ACTIVE" as const, createdAt: now, updatedAt: now });
        // Water
        meters.push({ id: meterId(i * 2 + 2), providerId: providerId(prov), serviceId: serviceId(i * 3 + 3), name: `Nước sinh hoạt BĐS ${i+1}`, unit: "m³", status: "ACTIVE" as const, createdAt: now, updatedAt: now });
    }
    await prisma.meter.createMany({ data: meters, skipDuplicates: true });

    // 3. GENERATE INVOICES (3 Invoices per contract for 150 contracts = 450 invoices)
    const readings = [];
    const usages = [];
    const invoices = [];
    const invoiceItems = [];
    const payments = [];

    let readingIdx = 1;
    let usageIdx = 1;
    let invoiceIdx = 1;
    let itemIdx = 1;
    let paymentIdx = 1;

    for (let c = 0; c < 150; c++) {
        const cId = contractId(c + 1);
        const custId = userId(101 + (c % 50));
        const propIdx = c % 30;
        const provId = providerId(housingProviders[propIdx % housingProviders.length]);
        const rId = roomId((c % 1200) + 1);

        const housingServiceIdx = propIdx * 3 + 1;
        const elecServiceIdx = propIdx * 3 + 2;
        const waterServiceIdx = propIdx * 3 + 3;

        let lastElec = 1200 + c * 50;
        let lastWater = 100 + c * 10;

        for (let m = 0; m < 3; m++) {
            // M = 0 (Tháng trước), M = 1 (Tháng này), M = 2 (Chưa thanh toán)
            const monthOffset = -2 + m; // 2 months ago, 1 month ago, current month
            const invoiceDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 5);
            
            const elecUsage = 80 + Math.floor(Math.random() * 50); // 80 - 130 kWh
            const waterUsage = 10 + Math.floor(Math.random() * 5); // 10 - 15 m3
            
            // Readings
            const startElecId = readingId(readingIdx++);
            const endElecId = readingId(readingIdx++);
            const startWaterId = readingId(readingIdx++);
            const endWaterId = readingId(readingIdx++);

            readings.push({ id: startElecId, roomId: rId, contractId: cId, meterId: meterId(propIdx * 2 + 1), recordedBy: userId(1), value: lastElec, source: "MANUAL" as const, status: "VALID" as const, createdAt: invoiceDate, updatedAt: invoiceDate });
            lastElec += elecUsage;
            readings.push({ id: endElecId, roomId: rId, contractId: cId, meterId: meterId(propIdx * 2 + 1), recordedBy: userId(1), value: lastElec, source: "IMAGE" as const, status: "VALID" as const, createdAt: invoiceDate, updatedAt: invoiceDate });
            
            readings.push({ id: startWaterId, roomId: rId, contractId: cId, meterId: meterId(propIdx * 2 + 2), recordedBy: userId(1), value: lastWater, source: "MANUAL" as const, status: "VALID" as const, createdAt: invoiceDate, updatedAt: invoiceDate });
            lastWater += waterUsage;
            readings.push({ id: endWaterId, roomId: rId, contractId: cId, meterId: meterId(propIdx * 2 + 2), recordedBy: userId(1), value: lastWater, source: "IMAGE" as const, status: "VALID" as const, createdAt: invoiceDate, updatedAt: invoiceDate });

            // Usage
            usages.push({ id: usageId(usageIdx++), billingPeriodId: periodId(c * 12 + m + 1), startReadingId: startElecId, endReadingId: endElecId, createdAt: invoiceDate });
            usages.push({ id: usageId(usageIdx++), billingPeriodId: periodId(c * 12 + m + 1), startReadingId: startWaterId, endReadingId: endWaterId, createdAt: invoiceDate });

            // Invoice
            const rentPrice = 4000000 + (propIdx % 5) * 1500000;
            const elecPrice = elecUsage * 3800;
            const waterPrice = waterUsage * 20000;
            const total = rentPrice + elecPrice + waterPrice;
            const invStatus = m === 2 ? "UNPAID" : "PAID";

            const invId = invoiceId(invoiceIdx++);
            invoices.push({
                id: invId,
                invoiceNumber: `INV-2026-${String(invoiceIdx).padStart(5, "0")}`,
                customerId: custId,
                contractId: cId,
                billingPeriodId: periodId(c * 12 + m + 1),
                providerId: provId,
                total,
                status: invStatus as InvoiceStatus,
                createdAt: invoiceDate,
                updatedAt: invoiceDate
            });

            // Invoice Items
            invoiceItems.push({ id: invoiceItemId(itemIdx++), invoiceId: invId, servicePriceId: servicePriceId(housingServiceIdx * 2 - 1), quantity: 1, unit: "tháng", unitPrice: rentPrice, amount: rentPrice, createdAt: invoiceDate });
            invoiceItems.push({ id: invoiceItemId(itemIdx++), invoiceId: invId, servicePriceId: servicePriceId(elecServiceIdx * 2 - 1), quantity: elecUsage, unit: "kWh", unitPrice: 3800, amount: elecPrice, createdAt: invoiceDate });
            invoiceItems.push({ id: invoiceItemId(itemIdx++), invoiceId: invId, servicePriceId: servicePriceId(waterServiceIdx * 2 - 1), quantity: waterUsage, unit: "m³", unitPrice: 20000, amount: waterPrice, createdAt: invoiceDate });

            // Payment
            if (invStatus === "PAID") {
                payments.push({
                    id: paymentId(paymentIdx++), invoiceId: invId, paymentMethod: "CARD" as const,
                    paymentLinkId: `PAY-${invId.substring(invId.length - 8)}`, status: "SUCCESS" as const,
                    paidAt: new Date(invoiceDate.getTime() + 86400000 * 2), createdAt: invoiceDate
                });
            }
        }
    }

    // Chunking to prevent insert errors
    for (let i = 0; i < readings.length; i += 1000) await prisma.meterReading.createMany({ data: readings.slice(i, i + 1000), skipDuplicates: true });
    for (let i = 0; i < usages.length; i += 1000) await prisma.serviceUsage.createMany({ data: usages.slice(i, i + 1000), skipDuplicates: true });
    for (let i = 0; i < invoices.length; i += 500) await prisma.invoice.createMany({ data: invoices.slice(i, i + 500), skipDuplicates: true });
    for (let i = 0; i < invoiceItems.length; i += 1000) await prisma.invoiceItem.createMany({ data: invoiceItems.slice(i, i + 1000), skipDuplicates: true });
    for (let i = 0; i < payments.length; i += 500) await prisma.payment.createMany({ data: payments.slice(i, i + 500), skipDuplicates: true });

    console.log(`Đã seed billing-service: ${meters.length} meters, ${readings.length} readings, ${invoices.length} invoices, ${payments.length} payments.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
