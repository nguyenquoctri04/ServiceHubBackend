const { PrismaClient: CatalogClient } = require('@prisma/client-catalog');
const { PrismaClient: ContractClient } = require('@prisma/client-contract');
const { PrismaClient: BillingClient } = require('@prisma/client-billing');

async function seedDemo() {
    console.log("Starting Demo Seeding for External Laundry Service Provider...");

    const catalog = new CatalogClient();
    const contract = new ContractClient();
    const billing = new BillingClient();

    const customerId = '30000000-0000-0000-0000-000000000101'; // khachhang1@servicehub.vn
    const categoryId = '60000000-0000-0000-0000-000000000002'; // CLEANING category
    const now = new Date();

    const providers = [
        '40000000-0000-4000-8000-000000000001', // External Service (nhacungcap1@servicehub.vn)
        '40000000-0000-4000-8000-000000000002', // Property Manager (nhacungcap2@servicehub.vn)
    ];

    for (let pIndex = 0; pIndex < providers.length; pIndex++) {
        const providerId = providers[pIndex];
        const offset = pIndex * 1000;
        console.log(`\n--- Seeding for provider: ${providerId} ---`);

        // Helper functions for predictable UUIDs
        const extServiceId = (n: number) => `61111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;
        const extRuleId = (n: number) => `65111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;
        const extPriceId = (n: number) => `62111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;
        const extScheduleId = (n: number) => `64111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;
        const extContractId = (n: number) => `70111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;
        const extInvoiceId = (n: number) => `90111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;
        const extInvoiceItemId = (n: number) => `94111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;
        const extViolationId = (n: number) => `77111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;
        const extPeriodId = (n: number) => `71111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;
        const extContractServiceId = (n: number) => `72111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;

        const propertyId = `80111111-0000-0000-0000-${String(offset + 1).padStart(12, "0")}`;
        const blockId = `81111111-0000-0000-0000-${String(offset + 1).padStart(12, "0")}`;
        const floorId = `82111111-0000-0000-0000-${String(offset + 1).padStart(12, "0")}`;
        const roomTypeId = `8a111111-0000-0000-0000-${String(offset + 1).padStart(12, "0")}`;
        const roomId = (n: number) => `83111111-0000-0000-0000-${String(n + offset).padStart(12, "0")}`;

    const laundryServices = [
        { name: "Giặt sấy lấy liền", desc: "Giặt ủi quần áo nhanh", price: 25000, unit: "kg", billingFrequency: "ONE_TIME" },
        { name: "Giặt hấp áo vest", desc: "Giặt hấp cao cấp", price: 80000, unit: "bộ", billingFrequency: "ONE_TIME" },
        { name: "Giặt sấy gấu bông", desc: "Giặt sấy gấu bông lớn", price: 150000, unit: "con", billingFrequency: "ONE_TIME" },
        { name: "Giặt rèm cửa định kỳ", desc: "Giặt rèm cửa tận nơi mỗi tháng", price: 500000, unit: "tháng", billingFrequency: "RECURRING" },
        { name: "Vệ sinh giày", desc: "Vệ sinh giày thể thao", price: 60000, unit: "đôi", billingFrequency: "ONE_TIME" },
    ];

    // 1. Seed Catalog Services
    console.log("- Seeding catalog services...");
    for (let i = 0; i < laundryServices.length; i++) {
        const svc = laundryServices[i];
        
        await catalog.serviceBillingRule.upsert({
            where: { id: extRuleId(i + 1) },
            update: {},
            create: {
                id: extRuleId(i + 1), calculationMethod: svc.billingFrequency === "RECURRING" ? "FIXED" : "QUANTITY", 
                billingFrequency: svc.billingFrequency,
                billingIntervalValue: 1, billingIntervalUnit: "MONTH", prorationMethod: "NONE",
                usageSource: false, createdAt: now, updatedAt: now
            }
        });

        await catalog.service.upsert({
            where: { id: extServiceId(i + 1) },
            update: { providerId: providerId },
            create: {
                id: extServiceId(i + 1), name: svc.name, description: svc.desc, status: "ACTIVE", 
                address: "Toàn quốc", latitude: 10.7, longitude: 106.6,
                requiresPrepayment: false, requiresContract: svc.billingFrequency === "RECURRING", 
                providerId: providerId, categoryId: categoryId,
                billingRuleId: extRuleId(i + 1), serviceType: "NORMAL", roomTypeId: null, 
                createdAt: now, updatedAt: now
            }
        });

        await catalog.billingSchedule.upsert({
            where: { id: extScheduleId(i + 1) },
            update: {},
            create: { id: extScheduleId(i + 1), serviceId: extServiceId(i + 1), billingDay: 1, dueDays: 5, createdAt: now, updatedAt: now }
        });

        await catalog.servicePrice.upsert({
            where: { id: extPriceId(i + 1) },
            update: {},
            create: { id: extPriceId(i + 1), createdBy: customerId, serviceId: extServiceId(i + 1), price: String(svc.price), unit: svc.unit, effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now }
        });
    }

    console.log("- Seeding properties and rooms for Property Manager Dashboard...");
    await catalog.property.upsert({
        where: { id: propertyId },
        update: { providerId },
        create: {
            id: propertyId, providerId, propertyName: "Chung cư Demo Giặt ủi", address: "123 Đường Demo, Quận Demo", latitude: 10.7, longitude: 106.6, description: "Khu chung cư demo", status: "ACTIVE", createdAt: now, updatedAt: now
        }
    });
    await catalog.block.upsert({
        where: { id: blockId }, update: {}, create: { id: blockId, propertyId, blockName: "Block A", status: "ACTIVE", createdAt: now, updatedAt: now }
    });
    await catalog.floor.upsert({
        where: { id: floorId }, update: {}, create: { id: floorId, blockId, floorName: "Tầng 1", status: "ACTIVE", createdAt: now, updatedAt: now }
    });
    await catalog.roomType.upsert({
        where: { id: roomTypeId }, update: {}, create: { id: roomTypeId, propertyId, typeName: "Studio Cơ bản", area: 35, maxOccupancy: 2, status: "ACTIVE", createdAt: now, updatedAt: now }
    });
    for (let r = 1; r <= 5; r++) {
        await catalog.room.upsert({
            where: { id: roomId(r) },
            update: {},
            create: { id: roomId(r), floorId, roomTypeId, roomNumber: `Phòng ${r}01`, status: "ACTIVE", createdAt: now, updatedAt: now }
        });
    }

    // 2. Seed Contracts (For recurring services)
    console.log("- Seeding contracts and violations...");
    const contractData = [
        { id: extContractId(1), num: `HD-LAUNDRY-${pIndex}-001`, status: "ACTIVE", type: "expiring" }, 
        { id: extContractId(2), num: `HD-LAUNDRY-${pIndex}-002`, status: "EXPIRED", type: "past" },
        { id: extContractId(3), num: `HD-LAUNDRY-${pIndex}-003`, status: "ACTIVE", type: "issue" },
        { id: extContractId(4), num: `HD-LAUNDRY-${pIndex}-004`, status: "PENDING_SIGNATURE", type: "recent" },
        { id: extContractId(5), num: `HD-LAUNDRY-${pIndex}-005`, status: "DRAFT", type: "recent" },
        { id: extContractId(6), num: `HD-LAUNDRY-${pIndex}-006`, status: "CANCELLED", type: "past" },
        { id: extContractId(7), num: `HD-LAUNDRY-${pIndex}-007`, status: "TERMINATED", type: "past" },
        { id: extContractId(8), num: `HD-LAUNDRY-${pIndex}-008`, status: "ACTIVE", type: "normal" },
        { id: extContractId(9), num: `HD-LAUNDRY-${pIndex}-009`, status: "ACTIVE", type: "normal" },
        { id: extContractId(10), num: `HD-LAUNDRY-${pIndex}-010`, status: "PENDING_SIGNATURE", type: "recent" },
    ];

    for (let i = 0; i < contractData.length; i++) {
        const c = contractData[i];
        
        let start = new Date(now.getTime() - 86400000 * 60); // 2 months ago
        if (c.type === "recent") start = new Date(now.getTime() - 86400000 * 2);
        if (c.type === "past") start = new Date(now.getTime() - 86400000 * 400); // > 1 year ago

        let end = new Date(start.getTime());
        end.setFullYear(end.getFullYear() + 1);

        if (c.status === "EXPIRED" || c.status === "TERMINATED" || c.status === "CANCELLED") {
            end = new Date(now.getTime() - 86400000 * 15);
        } else if (c.type === "expiring") {
            end = new Date(now.getTime() + 86400000 * 10); // Expires in 10 days
        }
        
        await contract.contract.upsert({
            where: { id: c.id },
            update: { providerId: providerId, status: c.status },
            create: {
                id: c.id, providerId: providerId, customerId: customerId, roomId: null,
                status: c.status,
                startDate: start, endDate: end,
                contractNumber: c.num, createdAt: start, updatedAt: start
            }
        });

        // Add a contract service link (Link to "Giặt rèm cửa định kỳ" which requires contract)
        await contract.contractService.upsert({
            where: { id: extContractServiceId(i + 1) },
            update: {},
            create: {
                id: extContractServiceId(i + 1),
                contractId: c.id,
                servicePriceId: extPriceId(4), // Giặt rèm cửa định kỳ
                quantity: "1",
                createdAt: start
            }
        });
        
        // Link contract to room if it's the first few contracts so Property Manager dashboard has room associations
        if (i < 3) {
            await contract.contract.update({
                where: { id: c.id },
                data: { roomId: roomId(i + 1) }
            });
        }
    }

    // 3. Seed Violations (Issue on Contract 3)
    await contract.violationRule.upsert({
        where: { id: '76111111-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '76111111-0000-0000-0000-000000000001', name: "Cung cấp dịch vụ sai cam kết (Giặt ủi)", description: "Nhà cung cấp không đạt chuẩn", targetType: "PROVIDER", isActive: true, createdAt: now, updatedAt: now
        }
    });

    await contract.violationCase.upsert({
        where: { id: extViolationId(1) },
        update: { providerId: providerId, status: 'REPORTED' },
        create: {
            id: extViolationId(1), contractId: extContractId(3), violationRuleId: '76111111-0000-0000-0000-000000000001',
            status: 'REPORTED', description: 'Giao đồ giặt trễ 2 ngày và làm rách rèm', reportedBy: customerId, providerId: providerId, occurredAt: now, createdAt: now, updatedAt: now
        }
    });
    
    // Seed a resolved violation
    await contract.violationCase.upsert({
        where: { id: extViolationId(2) },
        update: { providerId: providerId, status: 'RESOLVED' },
        create: {
            id: extViolationId(2), contractId: extContractId(1), violationRuleId: '76111111-0000-0000-0000-000000000001',
            status: 'RESOLVED', description: 'Giao lộn đồ nhưng đã khắc phục', reportedBy: customerId, providerId: providerId, occurredAt: new Date(now.getTime() - 86400000 * 5), createdAt: now, updatedAt: now
        }
    });

    // 4. Seed Invoices
    console.log("- Seeding invoices...");
    const invoiceData: any[] = [];
    
    // Generate historical PAID invoices for the last 6 months for Revenue Growth Chart
    for (let m = 0; m < 6; m++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 5);
        invoiceData.push({ id: extInvoiceId(invoiceData.length + 1), cId: extContractId(1), status: 'PAID', total: 600000 + (Math.random() * 400000), date: monthDate });
        invoiceData.push({ id: extInvoiceId(invoiceData.length + 1), cId: extContractId(8), status: 'PAID', total: 500000 + (Math.random() * 200000), date: monthDate });
    }

    // Generate recent UNPAID and OVERDUE invoices for Aging Chart
    invoiceData.push({ id: extInvoiceId(invoiceData.length + 1), cId: extContractId(9), status: 'UNPAID', total: 450000, date: new Date(now.getTime() - 86400000 * 3) });
    invoiceData.push({ id: extInvoiceId(invoiceData.length + 1), cId: extContractId(3), status: 'UNPAID', total: 1200000, date: new Date(now.getTime() - 86400000 * 1) });
    invoiceData.push({ id: extInvoiceId(invoiceData.length + 1), cId: extContractId(1), status: 'OVERDUE', total: 800000, date: new Date(now.getTime() - 86400000 * 15) });
    invoiceData.push({ id: extInvoiceId(invoiceData.length + 1), cId: extContractId(8), status: 'OVERDUE', total: 1500000, date: new Date(now.getTime() - 86400000 * 25) });

    for (let i = 0; i < invoiceData.length; i++) {
        const inv = invoiceData[i];
        
        const invoiceDate = inv.date;

        await contract.billingPeriod.upsert({
            where: { id: extPeriodId(i + 1) },
            update: {},
            create: {
                id: extPeriodId(i + 1), contractId: inv.cId,
                periodStart: new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), 1),
                periodEnd: new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 0),
                createdAt: invoiceDate, updatedAt: invoiceDate
            }
        });

        await billing.invoice.upsert({
            where: { id: inv.id },
            update: { providerId: providerId, status: inv.status, total: inv.total },
            create: {
                id: inv.id, providerId: providerId, customerId: customerId, contractId: inv.cId,
                billingPeriodId: extPeriodId(i + 1),
                status: inv.status, total: inv.total, createdAt: invoiceDate, updatedAt: invoiceDate,
                invoiceNumber: `INV-LAUNDRY-${pIndex}-00${i+1}`
            }
        });

        // Add Invoice Item
        await billing.invoiceItem.upsert({
            where: { id: extInvoiceItemId(i + 1) },
            update: {},
            create: {
                id: extInvoiceItemId(i + 1),
                invoiceId: inv.id,
                servicePriceId: extPriceId(4),
                quantity: 1,
                unit: "tháng",
                unitPrice: 500000,
                amount: inv.total,
                createdAt: invoiceDate
            }
        });
        
        // Add payment if paid
        if (inv.status === 'PAID') {
            await billing.payment.upsert({
                where: { id: `85111111-0000-0000-0000-${String(i+offset+1).padStart(12, "0")}` },
                update: {},
                create: {
                    id: `85111111-0000-0000-0000-${String(i+offset+1).padStart(12, "0")}`,
                    invoiceId: inv.id, paymentMethod: "CARD",
                    paymentLinkId: `PAY-LAUNDRY-${pIndex}-${i+1}`, status: "SUCCESS",
                    paidAt: new Date(invoiceDate.getTime() + 86400000 * 2), createdAt: invoiceDate
                }
            })
        }
    }

    console.log("- Seeding meters and meter readings...");
    for (let m = 1; m <= 5; m++) {
        const meterIdStr = `86111111-0000-0000-0000-${String(m).padStart(12, "0")}`;
        await billing.meter.upsert({
            where: { id: meterIdStr },
            update: {},
            create: {
                id: meterIdStr, providerId: providerId, serviceId: extServiceId(1),
                name: `Đồng hồ điện phòng ${m}01`, unit: "kWh", status: "ACTIVE",
                createdAt: now, updatedAt: now
            }
        });
        
        // Seed 3 recorded readings this month
        if (m <= 3) {
            const readingId = `87111111-0000-0000-0000-${String(m + offset).padStart(12, "0")}`;
            await billing.meterReading.upsert({
                where: { id: readingId },
                update: {},
                create: {
                    id: readingId,
                    roomId: roomId(m), meterId: meterIdStr, recordedBy: providerId,
                    value: 120 + (Math.random() * 50), source: "MANUAL", status: "VALID",
                    createdAt: now, updatedAt: now
                }
            });
        }
    }

    }
    console.log("Demo Seeding completed successfully for all providers!");

    await catalog.$disconnect();
    await contract.$disconnect();
    await billing.$disconnect();
}

seedDemo().catch(console.error);
