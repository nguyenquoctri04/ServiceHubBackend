import { PrismaClient, InvoiceStatus, PaymentMethod, PaymentStatus, ReadingSource, ReadingStatus, MeterStatus } from "@prisma/client-billing";

const prisma = new PrismaClient();
const now = new Date();

// Cross-service UUID generators (Đồng bộ chuẩn 100% với identity, catalog, contract, notification, audit)
const userId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const providerId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const serviceId = (n: number) => `61000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const servicePriceId = (n: number) => `62000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const roomId = (n: number) => `6b000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const contractId = (n: number) => `70000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const periodId = (n: number) => `71000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const meterId = (n: number) => `80000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const readingId = (n: number) => `81000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const usageId = (n: number) => `82000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const invoiceId = (n: number) => `83000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const invoiceItemId = (n: number) => `84000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const paymentId = (n: number) => `85000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// Giá thuê phòng cơ sở theo 10 Bất động sản
const propertyBaseRents = [
    16000000, // 1: Vinhomes
    1200000,  // 2: KTX Cỏ May
    12500000, // 3: CityHouse
    18500000, // 4: Masteri Thảo Điền
    14000000, // 5: Eco Green
    6500000,  // 6: EHome Nam Long
    13500000, // 7: Sunrise City
    600000,   // 8: KTX ĐHQG
    3200000,  // 9: Nhà trọ Hoàng Phát
    6200000,  // 10: Hàng Xanh Residence
];

async function main() {
    console.log("--> Đang seed Billing Service...");

    // 1. CLEAR DỮ LIỆU CŨ THEO ĐÚNG THỨ TỰ PHỤ THUỘC
    await prisma.payment.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.serviceUsage.deleteMany();
    await prisma.meterReading.deleteMany();
    await prisma.meter.deleteMany();

    // 2. TẠO 60 ĐỒNG HỒ ĐIỆN VÀ NƯỚC (CHO 10 BẤT ĐỘNG SẢN)
    const meterInserts = [];
    let meterCounter = 1;

    for (let pNum = 1; pNum <= 10; pNum++) {
        // Mỗi BĐS tạo 1 đồng hồ điện và 1 đồng hồ nước sinh hoạt
        const elecMeterDbId = meterId((pNum - 1) * 2 + 1);
        const waterMeterDbId = meterId((pNum - 1) * 2 + 2);
        const elecServId = serviceId((pNum - 1) * 3 + 2);
        const waterServId = serviceId((pNum - 1) * 3 + 3);

        meterInserts.push({
            id: elecMeterDbId,
            providerId: providerId(pNum),
            serviceId: elecServId,
            name: `Đồng hồ điện sinh hoạt (BĐS ${pNum})`,
            unit: "kWh",
            status: "ACTIVE" as MeterStatus,
            createdAt: now,
            updatedAt: now,
        });

        meterInserts.push({
            id: waterMeterDbId,
            providerId: providerId(pNum),
            serviceId: waterServId,
            name: `Đồng hồ nước sinh hoạt (BĐS ${pNum})`,
            unit: "m³",
            status: "ACTIVE" as MeterStatus,
            createdAt: now,
            updatedAt: now,
        });
    }
    await prisma.meter.createMany({ data: meterInserts, skipDuplicates: true });

    // 3. TẠO CHỈ SỐ ĐO (READINGS), TIÊU THỤ (USAGES), HÓA ĐƠN (INVOICES) & THANH TOÁN (PAYMENTS)
    // 120 Hợp đồng Housing: mỗi hợp đồng tạo 3-4 kỳ hóa đơn
    // 40 Hợp đồng Dịch vụ ngoài: mỗi hợp đồng tạo 1-2 hóa đơn
    const readingInserts = [];
    const usageInserts = [];
    const invoiceInserts = [];
    const invoiceItemInserts = [];
    const paymentInserts = [];

    let readingCounter = 1;
    let usageCounter = 1;
    let invoiceCounter = 1;
    let invoiceItemCounter = 1;
    let paymentCounter = 1;

    // --- A. HÓA ĐƠN HOUSING (TIỀN NHÀ + ĐIỆN + NƯỚC) ---
    for (let cNum = 1; cNum <= 120; cNum++) {
        const cId = contractId(cNum);
        const pNum = Math.floor((cNum - 1) / 12) + 1; // Provider 1 -> 10
        const custId = userId(101 + ((cNum - 1) % 60));
        const rId = roomId(((pNum - 1) * 40) + ((cNum - 1) % 12) + 1);

        const housingPriceId = servicePriceId((pNum - 1) * 3 + 1);
        const elecPriceId = servicePriceId((pNum - 1) * 3 + 2);
        const waterPriceId = servicePriceId((pNum - 1) * 3 + 3);

        const baseRent = propertyBaseRents[pNum - 1];

        // Tạo 3 kỳ hóa đơn liên tiếp: 2 tháng trước, tháng trước, và tháng hiện tại
        for (let m = 0; m < 3; m++) {
            const targetDate = new Date(now.getFullYear(), now.getMonth() - (2 - m), 5);
            const invoiceYear = targetDate.getFullYear();
            const invoiceMonth = targetDate.getMonth() + 1;
            const invoiceDate = targetDate;

            // Mức tiêu thụ điện, nước sinh hoạt thực tế
            const elecUsage = 95 + ((cNum * 7 + m * 13) % 80); // 95 -> 175 kWh
            const waterUsage = 11 + ((cNum * 3 + m * 5) % 10);  // 11 -> 20 m3

            const elecCost = elecUsage * 3800;
            const waterCost = waterUsage * 22000;
            const totalInvoiceAmount = baseRent + elecCost + waterCost;

            // Đồng hồ tương ứng của BĐS
            const elecMeterDbId = meterId((pNum - 1) * 2 + 1);
            const waterMeterDbId = meterId((pNum - 1) * 2 + 2);

            // Chỉ số công tơ
            const startElecVal = 1000 + (cNum * 200) + (m * 150);
            const endElecVal = startElecVal + elecUsage;
            const startWaterVal = 150 + (cNum * 20) + (m * 15);
            const endWaterVal = startWaterVal + waterUsage;

            const startElecId = readingId(readingCounter++);
            const endElecId = readingId(readingCounter++);
            const startWaterId = readingId(readingCounter++);
            const endWaterId = readingId(readingCounter++);

            readingInserts.push({
                id: startElecId,
                roomId: rId,
                contractId: cId,
                meterId: elecMeterDbId,
                recordedBy: userId(1),
                value: startElecVal,
                imgUrl: `https://storage.servicehub.vn/meters/elec-${startElecId}.jpg`,
                source: "MANUAL" as ReadingSource,
                status: "VALID" as ReadingStatus,
                createdAt: new Date(invoiceYear, invoiceMonth - 2, 28),
                updatedAt: new Date(invoiceYear, invoiceMonth - 2, 28),
            });

            readingInserts.push({
                id: endElecId,
                roomId: rId,
                contractId: cId,
                meterId: elecMeterDbId,
                recordedBy: userId(1),
                value: endElecVal,
                imgUrl: `https://storage.servicehub.vn/meters/elec-${endElecId}.jpg`,
                source: "IMAGE" as ReadingSource,
                status: "VALID" as ReadingStatus,
                createdAt: invoiceDate,
                updatedAt: invoiceDate,
            });

            readingInserts.push({
                id: startWaterId,
                roomId: rId,
                contractId: cId,
                meterId: waterMeterDbId,
                recordedBy: userId(1),
                value: startWaterVal,
                imgUrl: `https://storage.servicehub.vn/meters/water-${startWaterId}.jpg`,
                source: "MANUAL" as ReadingSource,
                status: "VALID" as ReadingStatus,
                createdAt: new Date(invoiceYear, invoiceMonth - 2, 28),
                updatedAt: new Date(invoiceYear, invoiceMonth - 2, 28),
            });

            readingInserts.push({
                id: endWaterId,
                roomId: rId,
                contractId: cId,
                meterId: waterMeterDbId,
                recordedBy: userId(1),
                value: endWaterVal,
                imgUrl: `https://storage.servicehub.vn/meters/water-${endWaterId}.jpg`,
                source: "IMAGE" as ReadingSource,
                status: "VALID" as ReadingStatus,
                createdAt: invoiceDate,
                updatedAt: invoiceDate,
            });

            // Ghi nhận ServiceUsage
            const assignedPeriodId = periodId((cNum - 1) * 12 + m + 1);
            usageInserts.push({
                id: usageId(usageCounter++),
                billingPeriodId: assignedPeriodId,
                startReadingId: startElecId,
                endReadingId: endElecId,
                createdAt: invoiceDate,
            });
            usageInserts.push({
                id: usageId(usageCounter++),
                billingPeriodId: assignedPeriodId,
                startReadingId: startWaterId,
                endReadingId: endWaterId,
                createdAt: invoiceDate,
            });

            // Phân bổ trạng thái hóa đơn chuẩn 3 trường hợp:
            // m = 0 (Kỳ 2 tháng trước): 100% PAID
            // m = 1 (Kỳ tháng trước): 85% PAID, 15% OVERDUE
            // m = 2 (Kỳ hiện tại): 40% PAID, 50% UNPAID, 10% OVERDUE
            let invStatus: InvoiceStatus = "PAID";
            if (m === 1 && cNum % 7 === 0) {
                invStatus = "OVERDUE";
            } else if (m === 2) {
                if (cNum % 10 === 0) invStatus = "OVERDUE";
                else if (cNum % 2 === 0) invStatus = "UNPAID";
                else invStatus = "PAID";
            }

            const invId = invoiceId(invoiceCounter++);
            const invoiceNumStr = `HDDT-${invoiceYear}${String(invoiceMonth).padStart(2, "0")}-${String(invoiceCounter).padStart(5, "0")}`;

            invoiceInserts.push({
                id: invId,
                invoiceNumber: invoiceNumStr,
                customerId: custId,
                contractId: cId,
                billingPeriodId: assignedPeriodId,
                providerId: providerId(pNum),
                total: totalInvoiceAmount,
                status: invStatus,
                createdAt: invoiceDate,
                updatedAt: invStatus === "PAID" ? new Date(invoiceDate.getTime() + 86400000 * 2) : invoiceDate,
            });

            // 3 Mục chi tiết hóa đơn (InvoiceItems)
            invoiceItemInserts.push({
                id: invoiceItemId(invoiceItemCounter++),
                invoiceId: invId,
                servicePriceId: housingPriceId,
                quantity: 1,
                unit: "tháng",
                unitPrice: baseRent,
                amount: baseRent,
                createdAt: invoiceDate,
            });

            invoiceItemInserts.push({
                id: invoiceItemId(invoiceItemCounter++),
                invoiceId: invId,
                servicePriceId: elecPriceId,
                quantity: elecUsage,
                unit: "kWh",
                unitPrice: 3800,
                amount: elecCost,
                createdAt: invoiceDate,
            });

            invoiceItemInserts.push({
                id: invoiceItemId(invoiceItemCounter++),
                invoiceId: invId,
                servicePriceId: waterPriceId,
                quantity: waterUsage,
                unit: "m³",
                unitPrice: 22000,
                amount: waterCost,
                createdAt: invoiceDate,
            });

            // Ghi nhận thanh toán (Payment) cho hóa đơn
            if (invStatus === "PAID") {
                const methods: PaymentMethod[] = ["TRANSFER", "CASH"];
                const method = methods[(cNum + m) % methods.length];

                paymentInserts.push({
                    id: paymentId(paymentCounter++),
                    invoiceId: invId,
                    paymentMethod: method,
                    paymentLinkId: method !== "CASH" ? `PAYLINK-${invId.substring(invId.length - 8)}` : null,
                    status: "SUCCESS" as PaymentStatus,
                    paidAt: new Date(invoiceDate.getTime() + 86400000 * 2),
                    createdAt: invoiceDate,
                    qrCode: null,
                    checkOutUrl: null

                });
            } else if (invStatus === "OVERDUE" && cNum % 2 === 0) {
                // Thử thanh toán nhưng thất bại (FAILED)
                paymentInserts.push({
                    id: paymentId(paymentCounter++),
                    invoiceId: invId,
                    paymentMethod: "TRANSFER",
                    paymentLinkId: `PAYLINK-${invId.substring(invId.length - 8)}`,
                    status: "FAILED" as PaymentStatus,
                    paidAt: null,
                    createdAt: new Date(invoiceDate.getTime() + 86400000 * 10),
                    qrCode: null,
                    checkOutUrl: null
                });
            } else if (invStatus === "UNPAID" && cNum % 3 === 0) {
                // Đang chờ xử lý (PENDING)
                paymentInserts.push({
                    id: paymentId(paymentCounter++),
                    invoiceId: invId,
                    paymentMethod: "TRANSFER",
                    paymentLinkId: `PAYLINK-${invId.substring(invId.length - 8)}`,
                    status: "PENDING" as PaymentStatus,
                    paidAt: null,
                    createdAt: now,
                    qrCode: null,
                    checkOutUrl: null
                });
            }
        }
    }

    // --- B. HÓA ĐƠN DỊCH VỤ NGOÀI (EXTERNAL SERVICES) ---
    for (let extC = 121; extC <= 160; extC++) {
        const cId = contractId(extC);
        const pNum = 11 + ((extC - 121) % 15); // Provider 11 -> 25
        const custId = userId(101 + ((extC * 3) % 60));
        const extPriceId = servicePriceId(30 + ((pNum - 11) * 2) + 1);

        const invDate = new Date(now.getFullYear(), now.getMonth(), 10 + (extC % 15));
        const invId = invoiceId(invoiceCounter++);
        const serviceAmount = 250000 + ((extC % 5) * 150000); // 250k -> 850k

        const invStatus: InvoiceStatus = extC % 4 === 0 ? "UNPAID" : "PAID";

        invoiceInserts.push({
            id: invId,
            invoiceNumber: `HDDV-${now.getFullYear()}-${String(invoiceCounter).padStart(5, "0")}`,
            customerId: custId,
            contractId: cId,
            billingPeriodId: null,
            providerId: providerId(pNum),
            total: serviceAmount,
            status: invStatus,
            createdAt: invDate,
            updatedAt: invDate,
        });

        invoiceItemInserts.push({
            id: invoiceItemId(invoiceItemCounter++),
            invoiceId: invId,
            servicePriceId: extPriceId,
            quantity: 1,
            unit: "gói",
            unitPrice: serviceAmount,
            amount: serviceAmount,
            createdAt: invDate,
        });

        if (invStatus === "PAID") {
            paymentInserts.push({
                id: paymentId(paymentCounter++),
                invoiceId: invId,
                paymentMethod: extC % 2 === 0 ? "TRANSFER" : "TRANSFER",
                paymentLinkId: `PAYLINK-${invId.substring(invId.length - 8)}`,
                status: "SUCCESS" as PaymentStatus,
                paidAt: new Date(invDate.getTime() + 3600000),
                createdAt: invDate,
            });
        }
    }

    // Insert theo chunks
    for (let i = 0; i < readingInserts.length; i += 1000) {
        await prisma.meterReading.createMany({ data: readingInserts.slice(i, i + 1000), skipDuplicates: true });
    }
    for (let i = 0; i < usageInserts.length; i += 1000) {
        await prisma.serviceUsage.createMany({ data: usageInserts.slice(i, i + 1000), skipDuplicates: true });
    }
    for (let i = 0; i < invoiceInserts.length; i += 500) {
        await prisma.invoice.createMany({ data: invoiceInserts.slice(i, i + 500), skipDuplicates: true });
    }
    for (let i = 0; i < invoiceItemInserts.length; i += 1000) {
        await prisma.invoiceItem.createMany({ data: invoiceItemInserts.slice(i, i + 1000), skipDuplicates: true });
    }
    for (let i = 0; i < paymentInserts.length; i += 500) {
        await prisma.payment.createMany({ data: paymentInserts.slice(i, i + 500), skipDuplicates: true });
    }

    console.log(`✅ Seed Billing Service thành công:`);
    console.log(`   - ${meterInserts.length} Đồng hồ đo điện và nước.`);
    console.log(`   - ${readingInserts.length} Lần ghi chỉ số tiêu thụ.`);
    console.log(`   - ${usageInserts.length} Bản ghi ServiceUsage chu kỳ.`);
    console.log(`   - ${invoiceInserts.length} Hóa đơn (Đầy đủ PAID, UNPAID, OVERDUE).`);
    console.log(`   - ${invoiceItemInserts.length} Chi tiết mục hóa đơn.`);
    console.log(`   - ${paymentInserts.length} Giao dịch thanh toán (TRANSFER, CASH - SUCCESS/FAILED/PENDING).`);
}

main()
    .catch((e) => {
        console.error("❌ Lỗi seed Billing Service:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());