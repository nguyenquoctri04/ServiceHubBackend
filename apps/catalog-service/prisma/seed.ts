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
  billingRules: {
    ROOM_RENT: "61000000-0000-0000-0000-000000000001",
    CLEANING: "61000000-0000-0000-0000-000000000002",
    FOOD: "61000000-0000-0000-0000-000000000003",
    REPAIR: "61000000-0000-0000-0000-000000000004",
    OTHER: "61000000-0000-0000-0000-000000000005",
  },
  services: {
    ROOM_RENT: "62000000-0000-0000-0000-000000000001",
    CLEANING: "62000000-0000-0000-0000-000000000002",
    LAUNDRY: "62000000-0000-0000-0000-000000000003",
    MEAL: "62000000-0000-0000-0000-000000000004",
    ELECTRIC_REPAIR: "62000000-0000-0000-0000-000000000005",
    WATER_REPAIR: "62000000-0000-0000-0000-000000000006",
    DELIVERY: "62000000-0000-0000-0000-000000000007",
    INACTIVE_SERVICE: "62000000-0000-0000-0000-000000000008",
  },
  prices: {
    ROOM_RENT: "63000000-0000-0000-0000-000000000001",
    CLEANING: "63000000-0000-0000-0000-000000000002",
    LAUNDRY: "63000000-0000-0000-0000-000000000003",
    MEAL: "63000000-0000-0000-0000-000000000004",
    ELECTRIC_REPAIR: "63000000-0000-0000-0000-000000000005",
    WATER_REPAIR: "63000000-0000-0000-0000-000000000006",
    DELIVERY: "63000000-0000-0000-0000-000000000007",
    INACTIVE_SERVICE: "63000000-0000-0000-0000-000000000008",
  },
  properties: {
    PROPERTY_1: "64000000-0000-0000-0000-000000000001",
    PROPERTY_2: "64000000-0000-0000-0000-000000000002",
    PROPERTY_INACTIVE: "64000000-0000-0000-0000-000000000003",
  },
  roomTypes: {
    STUDIO: "65000000-0000-0000-0000-000000000001",
    ONE_BEDROOM: "65000000-0000-0000-0000-000000000002",
    DUPLEX: "65000000-0000-0000-0000-000000000003",
  },
  rooms: {
    ROOM_101: "66000000-0000-0000-0000-000000000001",
    ROOM_102: "66000000-0000-0000-0000-000000000002",
    ROOM_201: "66000000-0000-0000-0000-000000000003",
    ROOM_202: "66000000-0000-0000-0000-000000000004", // Inactive
    ROOM_301: "66000000-0000-0000-0000-000000000005", // Duplex
  },
};

const PROVIDERS = {
  RESIDENCE: "40000000-0000-0000-0000-000000000001",
  CLEANPRO: "40000000-0000-0000-0000-000000000002",
  FIXMASTER: "40000000-0000-0000-0000-000000000003",
  QUOC_TRI: "40000000-0000-0000-0000-000000000004",
};

async function main() {
  console.log("🌱 Seeding catalog service...");
  const now = new Date();

  // CATEGORY
  await prisma.category.createMany({
    data: [
      { id: IDS.categories.HOUSING, name: "Nhà ở", description: "Dịch vụ liên quan đến nhà ở, phòng và căn hộ" },
      { id: IDS.categories.CLEANING, name: "Dọn dẹp", description: "Dịch vụ vệ sinh và dọn dẹp" },
      { id: IDS.categories.FOOD, name: "Ăn uống", description: "Dịch vụ ăn uống và giao đồ ăn" },
      { id: IDS.categories.REPAIR, name: "Sửa chữa", description: "Dịch vụ sửa chữa và bảo trì" },
      { id: IDS.categories.OTHER, name: "Khác", description: "Các dịch vụ tiện ích khác" },
    ],
    skipDuplicates: true,
  });

  // BILLING RULES
  await prisma.serviceBillingRule.createMany({
    data: [
      { id: IDS.billingRules.ROOM_RENT, calculationMethod: "FIXED", billingFrequency: "RECURRING", billingIntervalValue: 1, billingIntervalUnit: "MONTH", prorationMethod: "DAILY", usageSource: false, createdAt: now, updatedAt: now },
      { id: IDS.billingRules.CLEANING, calculationMethod: "QUANTITY", billingFrequency: "ONE_TIME", billingIntervalValue: 1, billingIntervalUnit: "DAY", prorationMethod: "NONE", usageSource: false, createdAt: now, updatedAt: now },
      { id: IDS.billingRules.FOOD, calculationMethod: "QUANTITY", billingFrequency: "ONE_TIME", billingIntervalValue: 1, billingIntervalUnit: "DAY", prorationMethod: "NONE", usageSource: false, createdAt: now, updatedAt: now },
      { id: IDS.billingRules.REPAIR, calculationMethod: "QUANTITY", billingFrequency: "ONE_TIME", billingIntervalValue: 1, billingIntervalUnit: "DAY", prorationMethod: "NONE", usageSource: false, createdAt: now, updatedAt: now },
      { id: IDS.billingRules.OTHER, calculationMethod: "FIXED", billingFrequency: "ONE_TIME", billingIntervalValue: 1, billingIntervalUnit: "DAY", prorationMethod: "NONE", usageSource: false, createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // PROPERTY
  await prisma.property.createMany({
    data: [
      { id: IDS.properties.PROPERTY_1, providerId: PROVIDERS.RESIDENCE, propertyName: "ServiceHub Residence Quận 7", description: "Khu căn hộ cho thuê", address: "123 Nguyễn Văn Linh, Quận 7, TP.HCM", latitude: 10.7298, longitude: 106.7215, status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: IDS.properties.PROPERTY_2, providerId: PROVIDERS.RESIDENCE, propertyName: "ServiceHub Residence Thủ Đức", description: "Khu phòng cho thuê tại Thủ Đức", address: "50 Võ Văn Ngân, TP. Thủ Đức, TP.HCM", latitude: 10.8505, longitude: 106.7717, status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: IDS.properties.PROPERTY_INACTIVE, providerId: PROVIDERS.RESIDENCE, propertyName: "ServiceHub Cũ Gò Vấp", description: "Khu trọ cũ ngưng hoạt động", address: "10 Nguyễn Kiệm, Gò Vấp, TP.HCM", latitude: 10.8201, longitude: 106.6800, status: "INACTIVE", createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // ROOM TYPES
  await prisma.roomType.createMany({
    data: [
      { id: IDS.roomTypes.STUDIO, propertyId: IDS.properties.PROPERTY_1, typeName: "Studio", area: 30, maxOccupancy: 2, description: "Căn hộ studio đầy đủ tiện nghi", status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: IDS.roomTypes.ONE_BEDROOM, propertyId: IDS.properties.PROPERTY_1, typeName: "1 Bedroom", area: 45, maxOccupancy: 3, description: "Căn hộ một phòng ngủ", status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: IDS.roomTypes.DUPLEX, propertyId: IDS.properties.PROPERTY_2, typeName: "Duplex", area: 60, maxOccupancy: 4, description: "Căn hộ duplex hai tầng", status: "ACTIVE", createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // BLOCK
  await prisma.block.createMany({
    data: [
      { id: "67000000-0000-0000-0000-000000000001", propertyId: IDS.properties.PROPERTY_1, blockName: "Block A", status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: "67000000-0000-0000-0000-000000000002", propertyId: IDS.properties.PROPERTY_1, blockName: "Block B", status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: "67000000-0000-0000-0000-000000000003", propertyId: IDS.properties.PROPERTY_2, blockName: "Main Block", status: "ACTIVE", createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // FLOOR
  await prisma.floor.createMany({
    data: [
      { id: "68000000-0000-0000-0000-000000000001", blockId: "67000000-0000-0000-0000-000000000001", floorName: "Tầng 1", status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: "68000000-0000-0000-0000-000000000002", blockId: "67000000-0000-0000-0000-000000000001", floorName: "Tầng 2", status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: "68000000-0000-0000-0000-000000000003", blockId: "67000000-0000-0000-0000-000000000003", floorName: "Tầng 3", status: "ACTIVE", createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // ROOMS
  await prisma.room.createMany({
    data: [
      { id: IDS.rooms.ROOM_101, roomTypeId: IDS.roomTypes.STUDIO, floorId: "68000000-0000-0000-0000-000000000001", roomNumber: "101", status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: IDS.rooms.ROOM_102, roomTypeId: IDS.roomTypes.STUDIO, floorId: "68000000-0000-0000-0000-000000000001", roomNumber: "102", status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: IDS.rooms.ROOM_201, roomTypeId: IDS.roomTypes.ONE_BEDROOM, floorId: "68000000-0000-0000-0000-000000000002", roomNumber: "201", status: "ACTIVE", createdAt: now, updatedAt: now },
      { id: IDS.rooms.ROOM_202, roomTypeId: IDS.roomTypes.ONE_BEDROOM, floorId: "68000000-0000-0000-0000-000000000002", roomNumber: "202", status: "INACTIVE", createdAt: now, updatedAt: now }, // Inactive room
      { id: IDS.rooms.ROOM_301, roomTypeId: IDS.roomTypes.DUPLEX, floorId: "68000000-0000-0000-0000-000000000003", roomNumber: "301", status: "ACTIVE", createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // SERVICES
  await prisma.service.createMany({
    data: [
      { id: IDS.services.ROOM_RENT, name: "Cho thuê phòng Studio", description: "Phòng studio đầy đủ tiện nghi", status: "ACTIVE", address: "123 Nguyễn Văn Linh, Quận 7, TP.HCM", latitude: 10.7298, longitude: 106.7215, requiresPrepayment: false, requiresContract: true, providerId: PROVIDERS.RESIDENCE, categoryId: IDS.categories.HOUSING, billingRuleId: IDS.billingRules.ROOM_RENT, serviceType: "NORMAL", roomTypeId: IDS.roomTypes.STUDIO, createdAt: now, updatedAt: now },
      { id: IDS.services.CLEANING, name: "Dọn dẹp nhà ở", description: "Dịch vụ dọn dẹp nhà ở theo giờ", status: "ACTIVE", address: "TP. Thủ Đức, TP.HCM", latitude: 10.8505, longitude: 106.7717, requiresPrepayment: false, requiresContract: false, providerId: PROVIDERS.CLEANPRO, categoryId: IDS.categories.CLEANING, billingRuleId: IDS.billingRules.CLEANING, serviceType: "NORMAL", roomTypeId: null, createdAt: now, updatedAt: now },
      { id: IDS.services.LAUNDRY, name: "Giặt sấy quần áo", description: "Giặt và sấy quần áo tại nhà", status: "ACTIVE", address: "TP. Thủ Đức, TP.HCM", latitude: 10.8505, longitude: 106.7717, requiresPrepayment: false, requiresContract: false, providerId: PROVIDERS.CLEANPRO, categoryId: IDS.categories.CLEANING, billingRuleId: IDS.billingRules.CLEANING, serviceType: "ADDITION", roomTypeId: null, createdAt: now, updatedAt: now },
      { id: IDS.services.MEAL, name: "Suất ăn gia đình", description: "Suất ăn gia đình giao tận nơi", status: "ACTIVE", address: "TP. Thủ Đức, TP.HCM", latitude: 10.8505, longitude: 106.7717, requiresPrepayment: true, requiresContract: false, providerId: PROVIDERS.QUOC_TRI, categoryId: IDS.categories.FOOD, billingRuleId: IDS.billingRules.FOOD, serviceType: "NORMAL", roomTypeId: null, createdAt: now, updatedAt: now },
      { id: IDS.services.ELECTRIC_REPAIR, name: "Sửa chữa điện", description: "Sửa chữa điện dân dụng", status: "ACTIVE", address: "TP. Thủ Đức, TP.HCM", latitude: 10.8505, longitude: 106.7717, requiresPrepayment: false, requiresContract: false, providerId: PROVIDERS.FIXMASTER, categoryId: IDS.categories.REPAIR, billingRuleId: IDS.billingRules.REPAIR, serviceType: "NORMAL", roomTypeId: null, createdAt: now, updatedAt: now },
      { id: IDS.services.WATER_REPAIR, name: "Sửa chữa nước", description: "Sửa chữa đường ống và thiết bị nước", status: "ACTIVE", address: "TP. Thủ Đức, TP.HCM", latitude: 10.8505, longitude: 106.7717, requiresPrepayment: false, requiresContract: false, providerId: PROVIDERS.FIXMASTER, categoryId: IDS.categories.REPAIR, billingRuleId: IDS.billingRules.REPAIR, serviceType: "NORMAL", roomTypeId: null, createdAt: now, updatedAt: now },
      { id: IDS.services.DELIVERY, name: "Giao hàng tiện ích", description: "Giao hàng và mua hộ các vật dụng cần thiết", status: "ACTIVE", address: "TP. Thủ Đức, TP.HCM", latitude: 10.8505, longitude: 106.7717, requiresPrepayment: true, requiresContract: false, providerId: PROVIDERS.QUOC_TRI, categoryId: IDS.categories.OTHER, billingRuleId: IDS.billingRules.OTHER, serviceType: "NORMAL", roomTypeId: null, createdAt: now, updatedAt: now },
      { id: IDS.services.INACTIVE_SERVICE, name: "Dịch vụ đã dừng", description: "Dịch vụ không còn kinh doanh", status: "INACTIVE", address: "TP. Thủ Đức, TP.HCM", latitude: 10.8505, longitude: 106.7717, requiresPrepayment: false, requiresContract: false, providerId: PROVIDERS.FIXMASTER, categoryId: IDS.categories.REPAIR, billingRuleId: IDS.billingRules.REPAIR, serviceType: "NORMAL", roomTypeId: null, createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // SERVICE PRICES
  await prisma.servicePrice.createMany({
    data: [
      { id: IDS.prices.ROOM_RENT, createdBy: PROVIDERS.RESIDENCE, serviceId: IDS.services.ROOM_RENT, price: 5000000, unit: "MONTH", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now },
      { id: IDS.prices.CLEANING, createdBy: PROVIDERS.CLEANPRO, serviceId: IDS.services.CLEANING, price: 80000, unit: "HOUR", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now },
      { id: IDS.prices.LAUNDRY, createdBy: PROVIDERS.CLEANPRO, serviceId: IDS.services.LAUNDRY, price: 50000, unit: "KG", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now },
      { id: IDS.prices.MEAL, createdBy: PROVIDERS.QUOC_TRI, serviceId: IDS.services.MEAL, price: 50000, unit: "SET", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now },
      { id: IDS.prices.ELECTRIC_REPAIR, createdBy: PROVIDERS.FIXMASTER, serviceId: IDS.services.ELECTRIC_REPAIR, price: 200000, unit: "JOB", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now },
      { id: IDS.prices.WATER_REPAIR, createdBy: PROVIDERS.FIXMASTER, serviceId: IDS.services.WATER_REPAIR, price: 250000, unit: "JOB", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now },
      { id: IDS.prices.DELIVERY, createdBy: PROVIDERS.QUOC_TRI, serviceId: IDS.services.DELIVERY, price: 30000, unit: "ORDER", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, createdAt: now },
      { id: IDS.prices.INACTIVE_SERVICE, createdBy: PROVIDERS.FIXMASTER, serviceId: IDS.services.INACTIVE_SERVICE, price: 999999, unit: "JOB", effectiveFrom: new Date("2020-01-01"), effectiveTo: new Date("2025-01-01"), createdAt: now },
    ],
    skipDuplicates: true,
  });

  // BILLING SCHEDULE
  await prisma.billingSchedule.createMany({
    data: [
      { id: "69000000-0000-0000-0000-000000000001", serviceId: IDS.services.ROOM_RENT, billingDay: 1, dueDays: 5, createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // SERVICE IMAGES
  await prisma.serviceImage.createMany({
    data: [
      { id: "6a000000-0000-0000-0000-000000000001", serviceId: IDS.services.ROOM_RENT, imageUrl: "https://placehold.co/1200x800?text=Room", displayOrder: 1, createdAt: now },
      { id: "6a000000-0000-0000-0000-000000000002", serviceId: IDS.services.CLEANING, imageUrl: "https://placehold.co/1200x800?text=Cleaning", displayOrder: 1, createdAt: now },
      { id: "6a000000-0000-0000-0000-000000000003", serviceId: IDS.services.MEAL, imageUrl: "https://placehold.co/1200x800?text=Food", displayOrder: 1, createdAt: now },
      { id: "6a000000-0000-0000-0000-000000000004", serviceId: IDS.services.ELECTRIC_REPAIR, imageUrl: "https://placehold.co/1200x800?text=Repair", displayOrder: 1, createdAt: now },
      { id: "6a000000-0000-0000-0000-000000000005", serviceId: IDS.services.DELIVERY, imageUrl: "https://placehold.co/1200x800?text=Delivery", displayOrder: 1, createdAt: now },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Catalog seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
