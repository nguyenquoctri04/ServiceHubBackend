import { PrismaClient } from "@prisma/client-catalog";

const prisma = new PrismaClient();

const providerId = (n: number) => `40000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const userId = (n: number) => `30000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const categoryId = (n: number) => `60000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const serviceId = (n: number) => `61000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const priceId = (n: number) => `62000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const imageId = (n: number) => `63000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const scheduleId = (n: number) => `64000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const ruleId = (n: number) => `65000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const tierId = (n: number) => `66000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const propertyId = (n: number) => `67000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const blockId = (n: number) => `68000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const floorId = (n: number) => `69000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const roomTypeId = (n: number) => `6a000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const roomId = (n: number) => `6b000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const requirementId = (n: number) => `6c000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const now = new Date();

const categories = [
    ["HOUSING", "Nhà ở", "Nhà trọ, căn hộ và các dịch vụ liên quan đến chỗ ở."],
    ["CLEANING", "Vệ sinh", "Dịch vụ vệ sinh nhà ở và không gian sinh hoạt."],
    ["FOOD", "Ăn uống", "Suất ăn, cơm gia đình và dịch vụ thực phẩm."],
    ["REPAIR", "Sửa chữa", "Sửa chữa, bảo trì điện nước và thiết bị."],
    ["OTHER", "Khác", "Các dịch vụ tiện ích khác."],
] as const;

// Property Managers from identity seed:
// 1: Vinhomes (1)
// 2: Cỏ May (2)
// 3: CityHouse (3)
// 12: EHome (12)
// 13: Masteri (13)
// 16: Eco Green (16)
const propertyManagers = [1, 2, 3, 12, 13, 16];
// Other services providers: 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 17, 18, 19, 20
const externalProviders = [4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 17, 18, 20]; // 19 is suspended

const propNames = [
    ["Vinhomes Central Park", "720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM", 10.795, 106.721, 1],
    ["Vinhomes Grand Park", "Nguyễn Xiển, Long Thạnh Mỹ, TP. Thủ Đức", 10.840, 106.837, 1],
    ["KTX Cỏ May Làng Đại Học", "Khu đô thị ĐHQG, TP. Thủ Đức", 10.870, 106.802, 2],
    ["KTX Cỏ May Quận 10", "Hẻm 491 Hòa Hảo, Quận 10, TP.HCM", 10.763, 106.662, 2],
    ["CityHouse Phạm Ngọc Thạch", "17 Phạm Ngọc Thạch, Quận 3, TP.HCM", 10.783, 106.696, 3],
    ["CityHouse Nguyễn Đình Chiểu", "27B Nguyễn Đình Chiểu, Đa Kao, Quận 1", 10.787, 106.698, 3],
    ["EHome 3 Tây Sài Gòn", "Hồ Học Lãm, An Lạc, Bình Tân", 10.723, 106.612, 12],
    ["EHome 4 Bắc Sài Gòn", "Quốc lộ 13, Vĩnh Phú, Thuận An", 10.887, 106.702, 12],
    ["Masteri Thảo Điền", "159 Xa Lộ Hà Nội, Thảo Điền, Thủ Đức", 10.803, 106.741, 13],
    ["Masteri An Phú", "179 Xa Lộ Hà Nội, An Phú, Thủ Đức", 10.801, 106.744, 13],
    ["Eco Green Sài Gòn", "Nguyễn Văn Linh, Tân Thuận Tây, Quận 7", 10.748, 106.711, 16],
];

const serviceTemplates = [
    ["Dọn phòng định kỳ", "QUANTITY", "ADDITION", "CLEANING", "Vệ sinh phòng theo lịch", 4, 100000, "lần"],
    ["Tổng vệ sinh căn hộ", "FIXED", "ADDITION", "CLEANING", "Vệ sinh sâu, dọn nhà", 4, 1500000, "lần"],
    ["Giúp việc theo giờ", "QUANTITY", "ADDITION", "CLEANING", "Giúp việc gia đình (JupViec)", 14, 80000, "giờ"],
    ["Giặt sấy lấy liền", "QUANTITY", "ADDITION", "CLEANING", "Giặt ủi quần áo nhanh", 7, 25000, "kg"],
    ["Sửa điện dân dụng", "QUANTITY", "ADDITION", "REPAIR", "Kiểm tra và sửa chữa điện", 5, 200000, "lần"],
    ["Sửa đường nước", "QUANTITY", "ADDITION", "REPAIR", "Sửa rò rỉ nước", 5, 150000, "lần"],
    ["Vệ sinh máy lạnh", "FIXED", "ADDITION", "CLEANING", "Vệ sinh máy lạnh 1-2HP", 10, 150000, "máy"],
    ["Lắp đặt máy lạnh", "QUANTITY", "ADDITION", "REPAIR", "Lắp mới, di dời máy lạnh", 10, 300000, "máy"],
    ["Cơm trưa văn phòng", "QUANTITY", "ADDITION", "FOOD", "Suất ăn trưa giao tận nơi", 6, 40000, "suất"],
    ["Cơm tối gia đình", "QUANTITY", "ADDITION", "FOOD", "Suất ăn chiều dành cho gia đình", 6, 80000, "suất"],
    ["Diệt côn trùng", "FIXED", "ADDITION", "OTHER", "Xịt muỗi, diệt kiến, gián", 15, 450000, "lần"],
    ["Mở khóa cửa tại nhà", "QUANTITY", "ADDITION", "OTHER", "Mở khóa khẩn cấp 24/7", 17, 150000, "lần"],
    ["Lắp camera an ninh", "QUANTITY", "ADDITION", "OTHER", "Lắp đặt camera trong nhà", 18, 500000, "máy"],
    ["Chuyển nhà trọn gói", "FIXED", "ADDITION", "OTHER", "Chuyển phòng/nhà bằng xe tải nhỏ", 11, 1200000, "chuyến"],
    ["Giao nước tinh khiết", "QUANTITY", "ADDITION", "OTHER", "Bình nước Aqua 20L", 20, 50000, "bình"],
    ["Lắp mạng Internet sinh viên", "FIXED", "ADDITION", "OTHER", "Đăng ký cáp quang Viettel", 18, 165000, "tháng"],
    ["Bảo vệ 24/7", "FIXED", "ADDITION", "OTHER", "Thuê nhân viên an ninh", 8, 8000000, "tháng"],
    ["Lắp đặt tủ bếp", "FIXED", "ADDITION", "OTHER", "Thiết kế, lắp ráp tủ bếp", 9, 3000000, "lần"],
];

async function main() {
    // 1. Categories
    await prisma.category.createMany({
        data: categories.map((c, i) => ({
            id: categoryId(i + 1),
            name: c[1],
            description: c[2],
        })),
        skipDuplicates: true,
    });

    // 2. Properties
    const properties = propNames.map((p, i) => ({
        id: propertyId(i + 1),
        providerId: providerId(p[4] as number),
        propertyName: p[0] as string,
        description: `Khu dân cư hiện đại ${p[0]}`,
        address: p[1] as string,
        latitude: p[2] as number,
        longitude: p[3] as number,
        status: "ACTIVE" as const,
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.property.createMany({ data: properties, skipDuplicates: true });

    // 3. RoomTypes, Blocks, Floors, Rooms
    const roomTypes = [];
    const blocks = [];
    const floors = [];
    const rooms = [];

    // Tăng số lượng properties lặp lại nếu propNames ít hơn 30
    for (let i = 0; i < 30; i++) {
        const prop = properties[i % properties.length];
        
        // 2 Room Types per property iteration (Total 60)
        for (let j = 0; j < 2; j++) {
            roomTypes.push({
                id: roomTypeId(i * 2 + j + 1),
                propertyId: prop.id,
                typeName: j === 0 ? "Phòng Tiêu Chuẩn" : "Phòng Cao Cấp",
                area: j === 0 ? "25" : "45",
                maxOccupancy: j === 0 ? 2 : 4,
                description: "Thiết kế hiện đại, thông thoáng.",
                status: "ACTIVE" as const,
                createdAt: now,
                updatedAt: now,
            });
        }

        // 2 Blocks per property iteration (Total 60)
        for (let b = 0; b < 2; b++) {
            blocks.push({
                id: blockId(i * 2 + b + 1),
                propertyId: prop.id,
                blockName: `Tòa ${String.fromCharCode(65 + b)}`,
                status: "ACTIVE" as const,
                createdAt: now,
                updatedAt: now,
            });

            // 5 Floors per block (Total 300)
            for (let f = 0; f < 5; f++) {
                floors.push({
                    id: floorId(i * 10 + b * 5 + f + 1),
                    blockId: blockId(i * 2 + b + 1),
                    floorName: `Tầng ${f + 1}`,
                    status: "ACTIVE" as const,
                    createdAt: now,
                    updatedAt: now,
                });

                // 4 Rooms per floor (Total 1200)
                for (let r = 0; r < 4; r++) {
                    const roomNumStr = `${f + 1}${String(r + 1).padStart(2, "0")}`;
                    rooms.push({
                        id: roomId(i * 40 + b * 20 + f * 4 + r + 1),
                        roomTypeId: roomTypeId(i * 2 + (r % 2) + 1),
                        floorId: floorId(i * 10 + b * 5 + f + 1),
                        roomNumber: roomNumStr,
                        status: Math.random() > 0.1 ? "ACTIVE" as const : "INACTIVE" as const, // 10% inactive
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            }
        }
    }

    await prisma.roomType.createMany({ data: roomTypes, skipDuplicates: true });
    await prisma.block.createMany({ data: blocks, skipDuplicates: true });
    await prisma.floor.createMany({ data: floors, skipDuplicates: true });
    
    // Chunking room insert due to size
    for (let i = 0; i < rooms.length; i += 300) {
        await prisma.room.createMany({ data: rooms.slice(i, i + 300), skipDuplicates: true });
    }

    // 4. Services (Housing + Utility)
    const services = [];
    const rules = [];
    const prices = [];
    const schedules = [];
    let serviceIdx = 1;

    // A. Housing Services (Cho Thuê Phòng)
    for (let i = 0; i < 30; i++) {
        const prop = properties[i % properties.length];
        
        rules.push({
            id: ruleId(serviceIdx), calculationMethod: "FIXED" as const, billingFrequency: "RECURRING" as const,
            billingIntervalValue: 1, billingIntervalUnit: "MONTH" as const, prorationMethod: "DAILY" as const,
            usageSource: false, createdAt: now, updatedAt: now,
        });

        services.push({
            id: serviceId(serviceIdx), name: `Thuê Căn Hộ - ${prop.propertyName}`, description: "Hợp đồng thuê căn hộ chuẩn",
            status: "ACTIVE" as const, address: prop.address, latitude: prop.latitude, longitude: prop.longitude,
            requiresPrepayment: true, requiresContract: true, providerId: prop.providerId,
            categoryId: categoryId(1), // HOUSING
            billingRuleId: ruleId(serviceIdx), serviceType: "NORMAL" as const, roomTypeId: null,
            createdAt: now, updatedAt: now,
        });

        schedules.push({ id: scheduleId(serviceIdx), serviceId: serviceId(serviceIdx), billingDay: 1, dueDays: 5, createdAt: now, updatedAt: now });
        prices.push({ id: priceId(serviceIdx * 2 - 1), createdBy: userId(1), serviceId: serviceId(serviceIdx), price: String(4000000 + (i % 5) * 1500000), unit: "tháng", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now });
        serviceIdx++;

        // Default Utilities for each Housing property (Electricity, Water)
        rules.push({ id: ruleId(serviceIdx), calculationMethod: "QUANTITY" as const, billingFrequency: "RECURRING" as const, billingIntervalValue: 1, billingIntervalUnit: "MONTH" as const, prorationMethod: "NONE" as const, usageSource: true, createdAt: now, updatedAt: now });
        services.push({ id: serviceId(serviceIdx), name: "Điện sinh hoạt", description: "Tính theo chỉ số đồng hồ điện", status: "ACTIVE" as const, address: prop.address, latitude: prop.latitude, longitude: prop.longitude, requiresPrepayment: false, requiresContract: true, providerId: prop.providerId, categoryId: categoryId(1), billingRuleId: ruleId(serviceIdx), serviceType: "ADDITION" as const, roomTypeId: null, createdAt: now, updatedAt: now });
        schedules.push({ id: scheduleId(serviceIdx), serviceId: serviceId(serviceIdx), billingDay: 1, dueDays: 5, createdAt: now, updatedAt: now });
        prices.push({ id: priceId(serviceIdx * 2 - 1), createdBy: userId(1), serviceId: serviceId(serviceIdx), price: "3800", unit: "kWh", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now });
        serviceIdx++;

        rules.push({ id: ruleId(serviceIdx), calculationMethod: "QUANTITY" as const, billingFrequency: "RECURRING" as const, billingIntervalValue: 1, billingIntervalUnit: "MONTH" as const, prorationMethod: "NONE" as const, usageSource: true, createdAt: now, updatedAt: now });
        services.push({ id: serviceId(serviceIdx), name: "Nước sinh hoạt", description: "Tính theo chỉ số đồng hồ nước", status: "ACTIVE" as const, address: prop.address, latitude: prop.latitude, longitude: prop.longitude, requiresPrepayment: false, requiresContract: true, providerId: prop.providerId, categoryId: categoryId(1), billingRuleId: ruleId(serviceIdx), serviceType: "ADDITION" as const, roomTypeId: null, createdAt: now, updatedAt: now });
        schedules.push({ id: scheduleId(serviceIdx), serviceId: serviceId(serviceIdx), billingDay: 1, dueDays: 5, createdAt: now, updatedAt: now });
        prices.push({ id: priceId(serviceIdx * 2 - 1), createdBy: userId(1), serviceId: serviceId(serviceIdx), price: "20000", unit: "m³", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now });
        serviceIdx++;
    }

    // B. External Services
    for (let t of serviceTemplates) {
        rules.push({ id: ruleId(serviceIdx), calculationMethod: t[1] as any, billingFrequency: "RECURRING" as const, billingIntervalValue: 1, billingIntervalUnit: "MONTH" as const, prorationMethod: "NONE" as const, usageSource: false, createdAt: now, updatedAt: now });
        const catIdx = categories.findIndex(c => c[0] === t[3]) + 1;
        services.push({
            id: serviceId(serviceIdx), name: t[0] as string, description: t[4] as string, status: "ACTIVE" as const, address: "Toàn quốc", latitude: 10.7, longitude: 106.6,
            requiresPrepayment: false, requiresContract: false, providerId: providerId(t[5] as number), categoryId: categoryId(catIdx),
            billingRuleId: ruleId(serviceIdx), serviceType: t[2] as any, roomTypeId: null, createdAt: now, updatedAt: now,
        });
        schedules.push({ id: scheduleId(serviceIdx), serviceId: serviceId(serviceIdx), billingDay: 1, dueDays: 5, createdAt: now, updatedAt: now });
        prices.push({ id: priceId(serviceIdx * 2 - 1), createdBy: userId(1), serviceId: serviceId(serviceIdx), price: String(t[6]), unit: t[7] as string, effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now });
        serviceIdx++;
    }

    await prisma.serviceBillingRule.createMany({ data: rules, skipDuplicates: true });
    await prisma.service.createMany({ data: services, skipDuplicates: true });
    await prisma.billingSchedule.createMany({ data: schedules, skipDuplicates: true });
    await prisma.servicePrice.createMany({ data: prices, skipDuplicates: true });

    const requirements = [];
    // Link some housing services with utilities implicitly
    for (let i = 0; i < 30; i++) {
        requirements.push({ id: requirementId(i * 2 + 1), serviceId: serviceId(i * 3 + 1), additionalServiceId: serviceId(i * 3 + 2), status: "ACTIVE" as const });
        requirements.push({ id: requirementId(i * 2 + 2), serviceId: serviceId(i * 3 + 1), additionalServiceId: serviceId(i * 3 + 3), status: "ACTIVE" as const });
    }
    await prisma.serviceRequirement.createMany({ data: requirements, skipDuplicates: true });

    console.log(`Đã seed catalog-service: ${properties.length} BĐS, ${rooms.length} phòng, ${services.length} dịch vụ, ${prices.length} bảng giá.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
