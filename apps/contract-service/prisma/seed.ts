import { PrismaClient } from "@prisma/client-contract";

const prisma = new PrismaClient();

const IDS = {
  contracts: {
    CONTRACT_1: "70000000-0000-0000-0000-000000000001",
    CONTRACT_2: "70000000-0000-0000-0000-000000000002",
    CONTRACT_DRAFT: "70000000-0000-0000-0000-000000000003",
    CONTRACT_EXPIRED: "70000000-0000-0000-0000-000000000004",
  },
  contractServices: {
    CS_1: "71000000-0000-0000-0000-000000000001",
    CS_2: "71000000-0000-0000-0000-000000000002",
    CS_3: "71000000-0000-0000-0000-000000000003",
  },
  periods: {
    PERIOD_1: "72000000-0000-0000-0000-000000000001",
    PERIOD_2: "72000000-0000-0000-0000-000000000002",
  },
  terms: {
    TERM_1: "73000000-0000-0000-0000-000000000001",
    TERM_2: "73000000-0000-0000-0000-000000000002",
    TERM_3: "73000000-0000-0000-0000-000000000003",
    TERM_4: "73000000-0000-0000-0000-000000000004",
    TERM_5: "73000000-0000-0000-0000-000000000005",
    TERM_6: "73000000-0000-0000-0000-000000000006",
  },
  contractTerms: {
    CT_1: "74000000-0000-0000-0000-000000000001",
    CT_2: "74000000-0000-0000-0000-000000000002",
  },
  templates: {
    TEMPLATE_ROOM: "75000000-0000-0000-0000-000000000001",
    TEMPLATE_APARTMENT: "75000000-0000-0000-0000-000000000002",
    TEMPLATE_SERVICE_CLEANING: "75000000-0000-0000-0000-000000000003",
    TEMPLATE_SERVICE_MAINTENANCE: "75000000-0000-0000-0000-000000000004",
  },
  violationRules: {
    RULE_LATE_PAYMENT: "76000000-0000-0000-0000-000000000001",
    RULE_DAMAGE: "76000000-0000-0000-0000-000000000002",
    RULE_NOISE: "76000000-0000-0000-0000-000000000003",
    RULE_CONTRACT_BREAK: "76000000-0000-0000-0000-000000000004",
  },
  violationCases: {
    CASE_1: "77000000-0000-0000-0000-000000000001",
    CASE_2: "77000000-0000-0000-0000-000000000002",
  },
};

const USERS = {
  ADMIN: "30000000-0000-0000-0000-000000000001",
  CUSTOMER: "30000000-0000-0000-0000-000000000008", // CUSTOMER_TRI
  PROVIDER_RESIDENCE: "40000000-0000-0000-0000-000000000001",
  PROVIDER_CLEANPRO: "40000000-0000-0000-0000-000000000002",
};

const CATALOG = {
  ROOM: "63000000-0000-0000-0000-000000000001",
  CLEANING: "63000000-0000-0000-0000-000000000002",
};

const ROOMS = {
  ROOM_101: "66000000-0000-0000-0000-000000000001",
  ROOM_102: "66000000-0000-0000-0000-000000000002",
};

async function main() {
  console.log("🌱 Seeding contract service...");
  const now = new Date();

  // TERMS - Pháp lý chặt chẽ theo Luật Dân sự & Nhà ở
  await prisma.term.createMany({
    data: [
      { id: IDS.terms.TERM_1, content: "Điều khoản thanh toán: Bên B có trách nhiệm thanh toán tiền thuê đúng thời hạn quy định (từ ngày 01 đến ngày 05 hàng tháng). Nếu chậm thanh toán quá 10 ngày, Bên A có quyền đơn phương chấm dứt hợp đồng và thu hồi lại tài sản theo quy định pháp luật.", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_2, content: "Bảo quản tài sản: Bên B cam kết giữ gìn nhà cửa, các trang thiết bị nội thất theo biên bản bàn giao. Mọi hư hỏng do lỗi chủ quan của Bên B, Bên B phải bồi thường theo giá trị thị trường tại thời điểm bồi thường (Căn cứ Bộ luật Dân sự 2015).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_3, content: "Sử dụng đúng mục đích: Bên B cam kết sử dụng diện tích thuê đúng mục đích là để ở (không sử dụng làm kho chứa hàng cấm, hóa chất độc hại, hoặc kinh doanh trái phép).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_4, content: "Đơn phương chấm dứt hợp đồng (Bên A): Bên A có quyền đơn phương chấm dứt hợp đồng nếu Bên B vi phạm nghiêm trọng các điều khoản đã thỏa thuận và phải thông báo bằng văn bản cho Bên B trước ít nhất 30 ngày (Căn cứ Luật Nhà ở).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_5, content: "Bất khả kháng (Force Majeure): Hai bên được miễn trừ trách nhiệm hợp đồng trong các trường hợp bất khả kháng như thiên tai, dịch bệnh, chiến tranh, hoặc thay đổi chính sách nhà nước gây ảnh hưởng trực tiếp đến việc thực hiện hợp đồng (Căn cứ Khoản 1 Điều 156 Bộ luật Dân sự 2015).", status: "ACTIVE", createdAt: now },
      { id: IDS.terms.TERM_6, content: "Cam kết dịch vụ: Bên Cung cấp cam kết thực hiện đúng khối lượng và chất lượng dịch vụ dọn dẹp vệ sinh theo đúng thỏa thuận. Nếu không đạt yêu cầu, phải thực hiện lại miễn phí trong vòng 24h.", status: "ACTIVE", createdAt: now },
    ],
    skipDuplicates: true,
  });

  // CONTRACT TEMPLATES
  await prisma.contractTemplate.createMany({
    data: [
      {
        id: IDS.templates.TEMPLATE_ROOM, providerId: null, name: "Hợp đồng thuê phòng trọ (Tiêu chuẩn)", description: "Mẫu hợp đồng thuê phòng trọ tiêu chuẩn, dựa trên Luật Nhà ở.",
        content: { title: "HỢP ĐỒNG THUÊ PHÒNG TRỌ", sections: ["Thông tin các bên", "Đặc điểm tài sản thuê", "Giá thuê & Thanh toán", "Quyền và Nghĩa vụ", "Chấm dứt hợp đồng", "Cam kết chung"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_APARTMENT, providerId: null, name: "Hợp đồng thuê căn hộ chung cư", description: "Mẫu hợp đồng thuê căn hộ chung cư dài hạn, đầy đủ pháp lý.",
        content: { title: "HỢP ĐỒNG THUÊ CĂN HỘ CHUNG CƯ", sections: ["Căn cứ pháp lý (Bộ luật Dân sự 2015, Luật Nhà ở)", "Thông tin các bên", "Thông tin Căn hộ", "Giá thuê, Tiền cọc & Thanh toán", "Trách nhiệm các bên", "Quy định quản lý chung cư", "Chấm dứt hợp đồng"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_CLEANING, providerId: null, name: "Hợp đồng dịch vụ vệ sinh", description: "Hợp đồng cung cấp dịch vụ dọn dẹp vệ sinh nhà ở/văn phòng.",
        content: { title: "HỢP ĐỒNG CUNG CẤP DỊCH VỤ VỆ SINH", sections: ["Thông tin các bên", "Nội dung dịch vụ", "Chi phí & Thanh toán", "Bảo hành dịch vụ", "Xử lý bồi thường hư hại tài sản"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
      {
        id: IDS.templates.TEMPLATE_SERVICE_MAINTENANCE, providerId: null, name: "Hợp đồng bảo trì, sửa chữa", description: "Hợp đồng sửa chữa, bảo trì điện nước.",
        content: { title: "HỢP ĐỒNG SỬA CHỮA, BẢO TRÌ DỊCH VỤ", sections: ["Thông tin các bên", "Nghiệp vụ sửa chữa", "Phí dịch vụ & Vật tư", "Cam kết chất lượng (Bảo hành)", "Điều khoản bồi thường vi phạm"] },
        status: "ACTIVE", createdAt: now, updatedAt: now
      },
    ],
    skipDuplicates: true,
  });

  // CONTRACTS
  await prisma.contract.createMany({
    data: [
      { id: IDS.contracts.CONTRACT_1, contractNumber: "HD-2026-0001", roomId: ROOMS.ROOM_101, customerId: USERS.CUSTOMER, startDate: new Date("2026-08-01"), endDate: new Date("2027-08-01"), status: "ACTIVE", requireSignature: true, signedAt: new Date("2026-07-31"), createdAt: now, updatedAt: now },
      { id: IDS.contracts.CONTRACT_2, contractNumber: "HD-2026-0002", roomId: ROOMS.ROOM_102, customerId: "30000000-0000-0000-0000-000000000002", startDate: new Date("2026-08-01"), endDate: new Date("2027-08-01"), status: "ACTIVE", requireSignature: true, signedAt: new Date("2026-07-31"), createdAt: now, updatedAt: now },
      // Edge cases
      { id: IDS.contracts.CONTRACT_DRAFT, contractNumber: "HD-2026-DRAFT", roomId: ROOMS.ROOM_101, customerId: USERS.CUSTOMER, startDate: new Date("2026-09-01"), endDate: new Date("2027-09-01"), status: "DRAFT", requireSignature: true, signedAt: null, createdAt: now, updatedAt: now },
      { id: IDS.contracts.CONTRACT_EXPIRED, contractNumber: "HD-2024-0001", roomId: ROOMS.ROOM_102, customerId: USERS.CUSTOMER, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), status: "EXPIRED", requireSignature: true, signedAt: new Date("2023-12-31"), createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // CONTRACT SERVICES
  await prisma.contractService.createMany({
    data: [
      { id: IDS.contractServices.CS_1, contractId: IDS.contracts.CONTRACT_1, servicePriceId: CATALOG.ROOM, quantity: 1, createdAt: now },
      { id: IDS.contractServices.CS_2, contractId: IDS.contracts.CONTRACT_1, servicePriceId: CATALOG.CLEANING, quantity: 2, createdAt: now },
      { id: IDS.contractServices.CS_3, contractId: IDS.contracts.CONTRACT_2, servicePriceId: CATALOG.ROOM, quantity: 1, createdAt: now },
    ],
    skipDuplicates: true,
  });

  // BILLING PERIODS
  await prisma.billingPeriod.createMany({
    data: [
      { id: IDS.periods.PERIOD_1, contractId: IDS.contracts.CONTRACT_1, periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), createdAt: now, updatedAt: now },
      { id: IDS.periods.PERIOD_2, contractId: IDS.contracts.CONTRACT_2, periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // CONTRACT TERMS
  await prisma.contractTerm.createMany({
    data: [
      { id: IDS.contractTerms.CT_1, contractId: IDS.contracts.CONTRACT_1, termId: IDS.terms.TERM_1, createdAt: now },
      { id: IDS.contractTerms.CT_2, contractId: IDS.contracts.CONTRACT_1, termId: IDS.terms.TERM_2, createdAt: now },
    ],
    skipDuplicates: true,
  });

  // VIOLATION RULES
  await prisma.violationRule.createMany({
    data: [
      { id: IDS.violationRules.RULE_LATE_PAYMENT, name: "Thanh toán trễ hạn", description: "Khách hàng không thanh toán đúng hạn trên 3 ngày", targetType: "CUSTOMER", isActive: true, createdAt: now, updatedAt: now },
      { id: IDS.violationRules.RULE_DAMAGE, name: "Gây hư hỏng tài sản", description: "Làm hư hỏng tài sản nhà ở hoặc tài sản của bên thứ ba", targetType: "CUSTOMER", isActive: true, createdAt: now, updatedAt: now },
      { id: IDS.violationRules.RULE_NOISE, name: "Gây ồn ào mất trật tự", description: "Làm ồn quá mức sau 22h đêm ảnh hưởng xung quanh", targetType: "CUSTOMER", isActive: true, createdAt: now, updatedAt: now },
      { id: IDS.violationRules.RULE_CONTRACT_BREAK, name: "Đơn phương phá hợp đồng", description: "Chấm dứt hợp đồng trước hạn không lý do chính đáng", targetType: "BOTH", isActive: true, createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  // VIOLATION CASES
  await prisma.violationCase.createMany({
    data: [
      { id: IDS.violationCases.CASE_1, violationRuleId: IDS.violationRules.RULE_LATE_PAYMENT, contractId: IDS.contracts.CONTRACT_1, reportedBy: USERS.PROVIDER_RESIDENCE, serviceId: null, status: "REPORTED", description: "Khách hàng chậm đóng tiền nhà tháng 8", occurredAt: new Date("2026-08-06"), createdAt: now, updatedAt: now },
      { id: IDS.violationCases.CASE_2, violationRuleId: IDS.violationRules.RULE_DAMAGE, contractId: IDS.contracts.CONTRACT_1, reportedBy: USERS.PROVIDER_RESIDENCE, serviceId: null, status: "RESOLVED", description: "Làm vỡ kính cửa sổ", occurredAt: new Date("2026-08-10"), createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Contract seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
