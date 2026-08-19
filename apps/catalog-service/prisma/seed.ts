import { PrismaClient } from "@prisma/client-catalog";

const prisma = new PrismaClient();

const IDS = {
    categories: {
        HOUSING: "60000000-0000-0000-0000-000000000001",
        CLEANING: "60000000-0000-0000-0000-000000000002",
        FOOD: "60000000-0000-0000-0000-000000000003",
        REPAIR: "60000000-0000-0000-0000-000000000004",
        OTHER: "60000000-0000-0000-0000-000000000005",
    },
    providers: {
        PROVIDER_1: "40000000-0000-0000-0000-000000000001",
        PROVIDER_2: "40000000-0000-0000-0000-000000000002",
        PROVIDER_3: "40000000-0000-0000-0000-000000000003",
        PROVIDER_TRI: "40000000-0000-0000-0000-000000000004",
        PROVIDER_PENDING: "40000000-0000-0000-0000-000000000005",
        PROVIDER_REJECTED: "40000000-0000-0000-0000-000000000006",
        PROVIDER_SUSPENDED: "40000000-0000-0000-0000-000000000007",
        PROVIDER_EXPIRED: "40000000-0000-0000-0000-000000000008",
        PROVIDER_NO_IMAGES: "40000000-0000-0000-0000-000000000009",
    },
} as const;

const now = new Date();
const categories = [
    ["HOUSING", "Nhà ở", "Nhà trọ, căn hộ và các dịch vụ liên quan đến chỗ ở."],
    ["CLEANING", "Vệ sinh", "Dịch vụ vệ sinh nhà ở và không gian sinh hoạt."],
    ["FOOD", "Ăn uống", "Suất ăn, cơm gia đình và dịch vụ thực phẩm."],
    ["REPAIR", "Sửa chữa", "Sửa chữa, bảo trì điện nước và thiết bị."],
    ["OTHER", "Khác", "Các dịch vụ tiện ích khác."],
] as const;

const providerKeys = [
    "PROVIDER_1",
    "PROVIDER_2",
    "PROVIDER_3",
    "PROVIDER_TRI",
    "PROVIDER_PENDING",
    "PROVIDER_REJECTED",
    "PROVIDER_SUSPENDED",
    "PROVIDER_EXPIRED",
    "PROVIDER_NO_IMAGES",
] as const;

const serviceNames = [
    [
        "Phòng trọ tiêu chuẩn",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Phòng trọ sạch sẽ, đầy đủ tiện nghi cơ bản.",
    ],
    [
        "Phòng trọ có nội thất",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Phòng trọ có giường, tủ, bàn và máy lạnh.",
    ],
    [
        "Căn hộ studio",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Căn hộ studio phù hợp người độc thân và sinh viên.",
    ],
    [
        "Căn hộ một phòng ngủ",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Căn hộ một phòng ngủ tiện nghi, an ninh.",
    ],
    [
        "Căn hộ hai phòng ngủ",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Căn hộ hai phòng ngủ cho gia đình nhỏ.",
    ],
    [
        "Phòng ở ghép",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Không gian ở ghép tiết kiệm chi phí.",
    ],
    [
        "Dọn phòng định kỳ",
        "QUANTITY",
        "ADDITION",
        "CLEANING",
        "Vệ sinh phòng theo lịch định kỳ.",
    ],
    [
        "Tổng vệ sinh căn hộ",
        "FIXED",
        "ADDITION",
        "CLEANING",
        "Vệ sinh toàn bộ căn hộ sau thời gian dài sử dụng.",
    ],
    [
        "Vệ sinh nhà bếp",
        "FIXED",
        "ADDITION",
        "CLEANING",
        "Làm sạch bếp, bồn rửa và khu vực nấu ăn.",
    ],
    [
        "Vệ sinh nhà tắm",
        "FIXED",
        "ADDITION",
        "CLEANING",
        "Làm sạch sàn, tường, lavabo và thiết bị vệ sinh.",
    ],
    [
        "Giặt chăn ga",
        "QUANTITY",
        "ADDITION",
        "CLEANING",
        "Giặt chăn, ga, gối và vỏ nệm.",
    ],
    [
        "Giặt rèm cửa",
        "QUANTITY",
        "ADDITION",
        "CLEANING",
        "Giặt và vệ sinh rèm cửa tại nhà.",
    ],
    [
        "Cơm trưa gia đình",
        "QUANTITY",
        "ADDITION",
        "FOOD",
        "Suất cơm trưa theo khẩu vị gia đình Việt.",
    ],
    [
        "Cơm văn phòng",
        "QUANTITY",
        "ADDITION",
        "FOOD",
        "Suất cơm văn phòng giao tận nơi.",
    ],
    [
        "Bữa sáng dinh dưỡng",
        "QUANTITY",
        "ADDITION",
        "FOOD",
        "Bữa sáng đầy đủ dinh dưỡng.",
    ],
    [
        "Mâm cơm gia đình",
        "QUANTITY",
        "ADDITION",
        "FOOD",
        "Mâm cơm nhiều món dành cho gia đình.",
    ],
    [
        "Đồ ăn nhẹ buổi chiều",
        "QUANTITY",
        "ADDITION",
        "FOOD",
        "Các món ăn nhẹ dùng trong ngày.",
    ],
    [
        "Nước uống đóng chai",
        "QUANTITY",
        "ADDITION",
        "FOOD",
        "Nước uống đóng chai giao theo số lượng.",
    ],
    [
        "Sửa điện dân dụng",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Kiểm tra và sửa chữa hệ thống điện dân dụng.",
    ],
    [
        "Sửa đường nước",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Xử lý rò rỉ và hư hỏng đường nước.",
    ],
    [
        "Sửa máy lạnh",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Kiểm tra và sửa chữa máy lạnh.",
    ],
    [
        "Bảo trì máy lạnh",
        "FIXED",
        "ADDITION",
        "REPAIR",
        "Bảo trì máy lạnh định kỳ.",
    ],
    [
        "Sửa máy giặt",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Kiểm tra và sửa chữa máy giặt.",
    ],
    [
        "Sửa tủ lạnh",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Kiểm tra và sửa chữa tủ lạnh.",
    ],
    [
        "Lắp đặt đèn",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Lắp đặt và thay thế đèn chiếu sáng.",
    ],
    [
        "Lắp đặt ổ cắm",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Lắp đặt ổ cắm và công tắc điện.",
    ],
    [
        "Lắp vòi nước",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Lắp đặt và thay mới vòi nước.",
    ],
    [
        "Vệ sinh bồn nước",
        "FIXED",
        "ADDITION",
        "OTHER",
        "Vệ sinh bồn chứa nước sinh hoạt.",
    ],
    [
        "Chuyển đồ trong khu vực",
        "QUANTITY",
        "ADDITION",
        "OTHER",
        "Hỗ trợ vận chuyển đồ đạc trong khu vực.",
    ],
    [
        "Lắp đặt camera",
        "QUANTITY",
        "ADDITION",
        "OTHER",
        "Lắp đặt camera giám sát.",
    ],
    [
        "Bảo trì khóa cửa",
        "FIXED",
        "ADDITION",
        "OTHER",
        "Kiểm tra và bảo trì khóa cửa.",
    ],
    ["Làm chìa khóa", "QUANTITY", "ADDITION", "OTHER", "Đánh chìa khóa mới."],
    [
        "Diệt côn trùng",
        "FIXED",
        "ADDITION",
        "OTHER",
        "Xử lý côn trùng trong nhà.",
    ],
    [
        "Chăm sóc cây cảnh",
        "QUANTITY",
        "ADDITION",
        "OTHER",
        "Tưới nước, cắt tỉa và chăm sóc cây.",
    ],
    [
        "Phòng trọ gần trường học",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Phòng trọ thuận tiện cho sinh viên.",
    ],
    [
        "Phòng trọ có ban công",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Phòng trọ thoáng, có ban công riêng.",
    ],
    [
        "Phòng trọ có máy lạnh",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Phòng trọ có máy lạnh và nội thất cơ bản.",
    ],
    [
        "Căn hộ gần trung tâm",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Căn hộ thuận tiện đi lại đến khu trung tâm.",
    ],
    [
        "Căn hộ có chỗ để xe",
        "FIXED",
        "NORMAL",
        "HOUSING",
        "Căn hộ có khu vực để xe an toàn.",
    ],
    [
        "Dọn nhà sau chuyển phòng",
        "FIXED",
        "ADDITION",
        "CLEANING",
        "Dọn vệ sinh toàn bộ sau khi chuyển phòng.",
    ],
    [
        "Vệ sinh nệm",
        "QUANTITY",
        "ADDITION",
        "CLEANING",
        "Vệ sinh và khử mùi nệm.",
    ],
    [
        "Vệ sinh sofa",
        "QUANTITY",
        "ADDITION",
        "CLEANING",
        "Làm sạch sofa tại nhà.",
    ],
    ["Giặt thảm", "QUANTITY", "ADDITION", "CLEANING", "Giặt và làm sạch thảm."],
    [
        "Suất ăn ít dầu mỡ",
        "QUANTITY",
        "ADDITION",
        "FOOD",
        "Suất ăn cân bằng, ít dầu mỡ.",
    ],
    ["Suất ăn chay", "QUANTITY", "ADDITION", "FOOD", "Suất ăn chay theo ngày."],
    [
        "Sửa quạt điện",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Sửa chữa quạt điện dân dụng.",
    ],
    [
        "Sửa bình nóng lạnh",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Sửa chữa và kiểm tra bình nóng lạnh.",
    ],
    [
        "Sửa bếp điện",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Sửa chữa bếp điện và bếp từ.",
    ],
    [
        "Lắp kệ treo tường",
        "QUANTITY",
        "ADDITION",
        "OTHER",
        "Lắp đặt kệ và phụ kiện treo tường.",
    ],
    [
        "Vệ sinh máy lạnh",
        "FIXED",
        "ADDITION",
        "CLEANING",
        "Vệ sinh máy lạnh tại nhà.",
    ],
    [
        "Vệ sinh quạt",
        "QUANTITY",
        "ADDITION",
        "CLEANING",
        "Tháo và vệ sinh quạt.",
    ],
    [
        "Vệ sinh bếp từ",
        "FIXED",
        "ADDITION",
        "CLEANING",
        "Vệ sinh bếp từ và khu vực xung quanh.",
    ],
    [
        "Sửa cửa gỗ",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Sửa bản lề và cánh cửa gỗ.",
    ],
    [
        "Sửa cửa nhôm kính",
        "QUANTITY",
        "ADDITION",
        "REPAIR",
        "Sửa cửa nhôm kính và phụ kiện.",
    ],
    [
        "Lắp rèm cửa",
        "QUANTITY",
        "ADDITION",
        "OTHER",
        "Đo, lắp và điều chỉnh rèm cửa.",
    ],
    [
        "Lắp giàn phơi",
        "FIXED",
        "ADDITION",
        "OTHER",
        "Lắp giàn phơi thông minh hoặc truyền thống.",
    ],
    [
        "Bảo trì hệ thống nước",
        "FIXED",
        "ADDITION",
        "REPAIR",
        "Kiểm tra và bảo trì đường nước.",
    ],
    [
        "Bảo trì hệ thống điện",
        "FIXED",
        "ADDITION",
        "REPAIR",
        "Kiểm tra và bảo trì hệ thống điện.",
    ],
] as const;

function uuid(n: number) {
    return `61000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function priceId(n: number) {
    return `62000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function imageId(n: number) {
    return `63000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function scheduleId(n: number) {
    return `64000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function ruleId(n: number) {
    return `65000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function tierId(n: number) {
    return `66000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function propertyId(n: number) {
    return `67000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function blockId(n: number) {
    return `68000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function floorId(n: number) {
    return `69000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function roomTypeId(n: number) {
    return `6a000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function roomId(n: number) {
    return `6b000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function requirementId(n: number) {
    return `6c000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

async function main() {
    await prisma.category.createMany({
        data: categories.map(([key, name, description]) => ({
            id: IDS.categories[key as keyof typeof IDS.categories],
            name,
            description,
        })),
        skipDuplicates: true,
    });

    const rules = serviceNames.map(([, calculation], i) => ({
        id: ruleId(i + 1),
        calculationMethod: calculation as "FIXED" | "QUANTITY",
        billingFrequency: "RECURRING" as const,
        billingIntervalValue: 1,
        billingIntervalUnit: "MONTH" as const,
        prorationMethod: i % 3 === 0 ? ("DAILY" as const) : ("NONE" as const),
        usageSource: false,
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.serviceBillingRule.createMany({
        data: rules,
        skipDuplicates: true,
    });

    const services = serviceNames.map(
        ([name, calculation, type, category, description], i) => {
            const provider = providerKeys[i % providerKeys.length];
            return {
                id: uuid(i + 1),
                name,
                description,
                status:
                    provider === "PROVIDER_SUSPENDED"
                        ? ("INACTIVE" as const)
                        : ("ACTIVE" as const),
                address: `Đường số ${(i % 20) + 1}, Thành phố Hồ Chí Minh`,
                latitude: 10.76 + (i % 15) * 0.002,
                longitude: 106.68 + (i % 18) * 0.002,
                requiresPrepayment: i % 7 === 0,
                requiresContract: type === "NORMAL",
                providerId: IDS.providers[provider],
                categoryId:
                    IDS.categories[category as keyof typeof IDS.categories],
                billingRuleId: ruleId(i + 1),
                serviceType: type as "NORMAL" | "ADDITION",
                roomTypeId: null,
                createdAt: now,
                updatedAt: now,
            };
        },
    );
    await prisma.service.createMany({ data: services, skipDuplicates: true });

    const schedules = services.map((s, i) => ({
        id: scheduleId(i + 1),
        serviceId: s.id,
        billingDay: (i % 25) + 1,
        dueDays: 5 + (i % 5),
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.billingSchedule.createMany({
        data: schedules,
        skipDuplicates: true,
    });

    const prices = services.flatMap((s, i) => [
        {
            id: priceId(i * 2 + 1),
            createdBy: "30000000-0000-0000-0000-000000000001",
            serviceId: s.id,
            price: String(80000 + (i % 12) * 25000),
            unit:
                s.serviceType === "NORMAL"
                    ? "tháng"
                    : i % 3 === 0
                      ? "lần"
                      : "suất",
            effectiveFrom: new Date("2026-01-01"),
            effectiveTo: null,
            createdAt: now,
        },
        {
            id: priceId(i * 2 + 2),
            createdBy: "30000000-0000-0000-0000-000000000001",
            serviceId: s.id,
            price: String(90000 + (i % 12) * 25000),
            unit: s.serviceType === "NORMAL" ? "tháng" : "lần",
            effectiveFrom: new Date("2026-07-01"),
            effectiveTo: null,
            createdAt: now,
        },
    ]);
    await prisma.servicePrice.createMany({
        data: prices,
        skipDuplicates: true,
    });

    await prisma.servicePriceTier.createMany({
        data: prices.map((p, i) => ({
            id: tierId(i + 1),
            servicePriceId: p.id,
            fromValue: "1",
            toValue: i % 2 === 0 ? "5" : null,
            price: p.price,
        })),
        skipDuplicates: true,
    });

    await prisma.serviceImage.createMany({
        data: services.flatMap((s, i) => {
            const count = i % 10 === 0 ? 1 : 3;
            return Array.from({ length: count }, (_, j) => ({
                id: imageId(i * 3 + j + 1),
                serviceId: s.id,
                imageUrl: `https://example.com/dich-vu/${s.id}-${j + 1}.jpg`,
                displayOrder: j + 1,
                createdAt: now,
            }));
        }),
        skipDuplicates: true,
    });

    const properties = Array.from({ length: 15 }, (_, i) => ({
        id: propertyId(i + 1),
        providerId: IDS.providers[providerKeys[i % 4]],
        propertyName: `Khu nhà ở ${["An Bình", "Phúc Gia", "Hưng Thịnh", "Minh Khai"][i % 4]} ${i + 1}`,
        description: "Khu nhà ở sạch sẽ, an ninh và thuận tiện sinh hoạt.",
        address: `Số ${10 + i} đường Nguyễn Văn Linh, Thành phố Hồ Chí Minh`,
        latitude: 10.74 + i * 0.003,
        longitude: 106.65 + i * 0.003,
        status: "ACTIVE" as const,
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.property.createMany({
        data: properties,
        skipDuplicates: true,
    });

    const roomTypes = Array.from({ length: 45 }, (_, i) => ({
        id: roomTypeId(i + 1),
        propertyId: properties[i % properties.length].id,
        typeName: `Loại phòng ${i + 1}`,
        area: String(18 + (i % 8) * 3),
        maxOccupancy: 1 + (i % 4),
        description: "Phòng có thiết kế phù hợp nhu cầu sinh hoạt.",
        status: "ACTIVE" as const,
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.roomType.createMany({ data: roomTypes, skipDuplicates: true });

    const blocks = Array.from({ length: 30 }, (_, i) => ({
        id: blockId(i + 1),
        propertyId: properties[i % properties.length].id,
        blockName: `Tòa ${String.fromCharCode(65 + (i % 5))}`,
        status: "ACTIVE" as const,
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.block.createMany({ data: blocks, skipDuplicates: true });

    const floors = Array.from({ length: 60 }, (_, i) => ({
        id: floorId(i + 1),
        blockId: blocks[i % blocks.length].id,
        floorName: `Tầng ${(i % 5) + 1}`,
        status: "ACTIVE" as const,
        createdAt: now,
        updatedAt: now,
    }));
    await prisma.floor.createMany({ data: floors, skipDuplicates: true });

    await prisma.room.createMany({
        data: Array.from({ length: 300 }, (_, i) => ({
            id: roomId(i + 1),
            roomTypeId: roomTypes[i % roomTypes.length].id,
            floorId: floors[i % floors.length].id,
            roomNumber: `${(i % 10) + 1}${String((i % 20) + 1).padStart(2, "0")}`,
            status: i % 11 === 0 ? ("INACTIVE" as const) : ("ACTIVE" as const),
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.serviceRequirement.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
            id: requirementId(i + 1),
            serviceId: services[i].id,
            additionalServiceId: services[6 + (i % 24)].id,
            status: "ACTIVE" as const,
        })),
        skipDuplicates: true,
    });

    console.log(
        `Đã seed catalog: ${categories.length} danh mục, ${services.length} dịch vụ, ${prices.length} bảng giá, 300 phòng.`,
    );
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
