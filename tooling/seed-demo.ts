const { PrismaClient: CatalogClient } = require('@prisma/client-catalog');
const { PrismaClient: ContractClient } = require('@prisma/client-contract');
const { PrismaClient: BillingClient } = require('@prisma/client-billing');

async function seedDemo() {
    console.log("Starting Demo Seeding for External Laundry Service Provider...");

    const catalog = new CatalogClient();
    const contract = new ContractClient();
    const billing = new BillingClient();

    const providerId = 'df1e4d43-1e01-44aa-a09d-4f535fe9f051';
    const customerId = '30000000-0000-0000-0000-000000000101'; // khachhang1@servicehub.vn
    const categoryId = '60000000-0000-0000-0000-000000000002'; // CLEANING category
    const now = new Date();

    // Helper functions for predictable UUIDs
    const extServiceId = (n: number) => `61111111-0000-0000-0000-${String(n).padStart(12, "0")}`;
    const extRuleId = (n: number) => `65111111-0000-0000-0000-${String(n).padStart(12, "0")}`;
    const extPriceId = (n: number) => `62111111-0000-0000-0000-${String(n).padStart(12, "0")}`;
    const extScheduleId = (n: number) => `64111111-0000-0000-0000-${String(n).padStart(12, "0")}`;
    const extContractId = (n: number) => `70111111-0000-0000-0000-${String(n).padStart(12, "0")}`;
    const extInvoiceId = (n: number) => `90111111-0000-0000-0000-${String(n).padStart(12, "0")}`;
    const extInvoiceItemId = (n: number) => `94111111-0000-0000-0000-${String(n).padStart(12, "0")}`;
    const extViolationId = (n: number) => `77111111-0000-0000-0000-${String(n).padStart(12, "0")}`;
    const extPeriodId = (n: number) => `71111111-0000-0000-0000-${String(n).padStart(12, "0")}`;
    const extContractServiceId = (n: number) => `72111111-0000-0000-0000-${String(n).padStart(12, "0")}`;

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

    // 2. Seed Contracts (For recurring services)
    console.log("- Seeding contracts and violations...");
    const contractData = [
        { id: extContractId(1), num: "HD-LAUNDRY-001", status: "ACTIVE" }, // Hợp đồng còn hiệu lực
        { id: extContractId(2), num: "HD-LAUNDRY-002", status: "EXPIRED" }, // Hợp đồng hết hạn
        { id: extContractId(3), num: "HD-LAUNDRY-003", status: "ACTIVE" }, // Hợp đồng có vi phạm (Issue)
        { id: extContractId(4), num: "HD-LAUNDRY-004", status: "PENDING_SIGNATURE" }, // Hợp đồng chờ ký
    ];

    for (let i = 0; i < contractData.length; i++) {
        const c = contractData[i];
        
        let start = new Date(2025 + (i % 2), i % 12, 1);
        let end = new Date(start.getTime());
        end.setFullYear(end.getFullYear() + 1);
        if (c.status === "EXPIRED") end = new Date(now.getTime() - 86400000 * 30);
        
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
    const invoiceData = [
        { id: extInvoiceId(1), cId: extContractId(1), status: 'PAID', total: 500000 },
        { id: extInvoiceId(2), cId: extContractId(1), status: 'UNPAID', total: 500000 },
        { id: extInvoiceId(3), cId: extContractId(3), status: 'UNPAID', total: 500000 }, // OVERDUE logic usually handled by UNPAID + past due date
        { id: extInvoiceId(4), cId: extContractId(2), status: 'PAID', total: 500000 },
    ];

    for (let i = 0; i < invoiceData.length; i++) {
        const inv = invoiceData[i];
        
        await contract.billingPeriod.upsert({
            where: { id: extPeriodId(i + 1) },
            update: {},
            create: {
                id: extPeriodId(i + 1), contractId: inv.cId,
                periodStart: new Date(now.getFullYear(), now.getMonth() - (inv.status === 'PAID' ? 1 : 0), 1),
                periodEnd: new Date(now.getFullYear(), now.getMonth() - (inv.status === 'PAID' ? 1 : 0) + 1, 0),
                createdAt: now, updatedAt: now
            }
        });

        const invoiceDate = new Date(now.getFullYear(), now.getMonth() - (inv.status === 'PAID' ? 1 : 0), 5);

        await billing.invoice.upsert({
            where: { id: inv.id },
            update: { providerId: providerId, status: inv.status, total: inv.total },
            create: {
                id: inv.id, providerId: providerId, customerId: customerId, contractId: inv.cId,
                billingPeriodId: extPeriodId(i + 1),
                status: inv.status, total: inv.total, createdAt: invoiceDate, updatedAt: invoiceDate,
                invoiceNumber: `INV-LAUNDRY-00${i+1}`
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
                where: { id: `85111111-0000-0000-0000-${String(i+1).padStart(12, "0")}` },
                update: {},
                create: {
                    id: `85111111-0000-0000-0000-${String(i+1).padStart(12, "0")}`,
                    invoiceId: inv.id, paymentMethod: "CARD",
                    paymentLinkId: `PAY-LAUNDRY-${i+1}`, status: "SUCCESS",
                    paidAt: new Date(invoiceDate.getTime() + 86400000 * 2), createdAt: invoiceDate
                }
            })
        }
    }

    console.log("Demo Seeding for External Laundry Service Provider completed successfully!");

    await catalog.$disconnect();
    await contract.$disconnect();
    await billing.$disconnect();
}

seedDemo().catch(console.error);
