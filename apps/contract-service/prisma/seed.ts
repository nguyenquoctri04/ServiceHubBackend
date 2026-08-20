import { PrismaClient } from "@prisma/client-contract";

const prisma = new PrismaClient();
const now = new Date();

const userId = (n: number) => `30000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const providerId = (n: number) => `40000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const serviceId = (n: number) => `61000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const servicePrice = (n: number) => `62000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const roomId = (n: number) => `6b000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const contract = (n: number) => `70000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const periodId = (n: number) => `71000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const contractService = (n: number) => `72000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const fileId = (n: number) => `73000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const termId = (n: number) => `74000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const contractTermId = (n: number) => `75000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const violationRuleId = (n: number) => `76000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const violationCaseId = (n: number) => `77000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const evidenceId = (n: number) => `78000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const actionId = (n: number) => `79000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const restrictionId = (n: number) => `7a000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const appealId = (n: number) => `7b000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const contractTemplateId = (n: number) => `7c000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const templateVariableId = (n: number) => `7d000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const activeTerms = [
    "1. Căn cứ pháp lý: Căn cứ Bộ luật Dân sự 2015, Luật Kinh doanh bất động sản 2023, Luật Nhà ở 2023, Luật Bảo vệ quyền lợi người tiêu dùng 2023, Luật Giao dịch điện tử 2023 và các văn bản hướng dẫn thi hành.",
    "2. Đối tượng hợp đồng: Bên Cho Thuê/Cung Cấp đồng ý cho Bên Thuê/Sử Dụng thuê hoặc sử dụng dịch vụ tại địa điểm đã được hai bên thống nhất trên hệ thống.",
    "3. Giá và thanh toán: Giá cả được niêm yết rõ ràng bằng VNĐ. Phương thức và hạn thanh toán được quy định rõ tại Phụ lục hoặc phần tóm tắt. Bên Thuê có nghĩa vụ thanh toán đúng hạn.",
    "4. Đặt cọc (nếu có): Bên Thuê thanh toán khoản tiền cọc để bảo đảm thực hiện hợp đồng. Khoản cọc này được hoàn trả (hoặc cấn trừ) sau khi thanh lý hợp đồng và trừ đi các chi phí thiệt hại do Bên Thuê gây ra (nếu có).",
    "5. Bàn giao và nghiệm thu: Bên Cho Thuê bàn giao diện tích, trang thiết bị đúng tình trạng đã cam kết. Bên Thuê có trách nhiệm kiểm tra, ký biên bản bàn giao. Mọi hư hỏng sau thời điểm bàn giao do lỗi Bên Thuê thì Bên Thuê phải tự chịu chi phí sửa chữa.",
    "6. Quyền và nghĩa vụ Bên Cho Thuê/Cung Cấp: Được nhận thanh toán đúng hạn; có quyền tạm ngưng dịch vụ nếu Bên Thuê vi phạm nghĩa vụ thanh toán quá 15 ngày; đảm bảo tính hợp pháp của tài sản/dịch vụ cung cấp.",
    "7. Quyền và nghĩa vụ Bên Thuê/Sử Dụng: Sử dụng tài sản đúng mục đích; không được chuyển nhượng, cho thuê lại nếu không có sự đồng ý bằng văn bản của Bên Cho Thuê; tuân thủ nội quy khu dân cư, quy định PCCC và vệ sinh môi trường.",
    "8. Bảo vệ dữ liệu cá nhân (Căn cứ NĐ 13/2023/NĐ-CP): Các bên cam kết bảo mật thông tin cá nhân của nhau, chỉ xử lý thông tin cho mục đích thực hiện hợp đồng. Không mua bán, chuyển giao cho bên thứ ba khi chưa có sự đồng ý hợp pháp.",
    "9. Bất khả kháng: Trong trường hợp xảy ra sự kiện bất khả kháng (thiên tai, dịch bệnh, quyết định của cơ quan nhà nước, v.v.), bên bị ảnh hưởng phải thông báo ngay cho bên kia và được miễn trách nhiệm trong thời gian sự kiện bất khả kháng diễn ra.",
    "10. Đơn phương chấm dứt hợp đồng: Mỗi bên có quyền đơn phương chấm dứt hợp đồng nếu bên kia vi phạm nghiêm trọng các điều khoản cốt lõi và không khắc phục trong vòng 30 ngày kể từ ngày nhận được thông báo. Bên đơn phương chấm dứt hợp pháp không phải bồi thường thiệt hại.",
    "11. Giải quyết tranh chấp: Mọi tranh chấp phát sinh từ hợp đồng này trước tiên được giải quyết thông qua thương lượng thiện chí. Nếu không thành, một trong các bên có quyền khởi kiện tại Tòa án có thẩm quyền theo quy định pháp luật Việt Nam.",
    "12. Hợp đồng điện tử: Các bên thừa nhận giá trị pháp lý của chữ ký điện tử, hợp đồng điện tử và các xác nhận thông qua hệ thống phần mềm ServiceHub, phù hợp với Luật Giao dịch điện tử 2023.",
] as const;

const templateVariables = [
    ["provider_name", "Tên Bên Cho Thuê / Nhà Cung Cấp", "Bên Cho Thuê"],
    ["provider_business_id", "Mã số thuế / Giấy phép kinh doanh", "Bên Cho Thuê"],
    ["provider_address", "Địa chỉ trụ sở", "Bên Cho Thuê"],
    ["provider_rep", "Người đại diện theo pháp luật", "Bên Cho Thuê"],
    ["customer_name", "Tên Bên Thuê / Người Sử Dụng", "Bên Thuê"],
    ["customer_cccd", "Số CCCD / Hộ chiếu", "Bên Thuê"],
    ["customer_address", "Địa chỉ thường trú", "Bên Thuê"],
    ["contract_number", "Số Hợp Đồng", "Thông tin chung"],
    ["property_address", "Địa chỉ bất động sản / Nơi cung cấp", "Thông tin chung"],
    ["room_number", "Số phòng / Căn hộ", "Thông tin chung"],
    ["start_date", "Ngày bắt đầu", "Thời hạn"],
    ["end_date", "Ngày kết thúc", "Thời hạn"],
    ["price_monthly", "Tiền thuê hàng tháng", "Tài chính"],
    ["deposit_amount", "Số tiền đặt cọc", "Tài chính"],
] as const;

const contractTemplates = [
    {
        id: contractTemplateId(1),
        providerId: null, // Hệ thống mẫu chung
        name: "Hợp đồng thuê nhà ở (Chuẩn pháp lý 2023)",
        description: "Hợp đồng thuê nhà ở, căn hộ tuân thủ nghiêm ngặt Luật Nhà ở 2023 và Luật KDBĐS 2023.",
        content: {
            version: "2.0",
            documentType: "RESIDENTIAL_LEASE_AGREEMENT",
            legalReferences: ["Luật Nhà ở số 27/2023/QH15", "Luật Kinh doanh bất động sản số 29/2023/QH15"],
            sections: [
                { heading: "Điều 1: Thông tin các bên", body: "Bên Cho Thuê: {{provider_name}}, MST/ĐKKD: {{provider_business_id}}, Địa chỉ: {{provider_address}}, Đại diện: {{provider_rep}}. Bên Thuê: {{customer_name}}, CCCD: {{customer_cccd}}, Địa chỉ: {{customer_address}}." },
                { heading: "Điều 2: Đối tượng cho thuê", body: "Bên Cho Thuê đồng ý cho Bên Thuê thuê căn hộ/phòng số {{room_number}} tại địa chỉ {{property_address}} dùng làm nơi ở." },
                { heading: "Điều 3: Giá thuê và Tiền cọc", body: "Giá thuê hàng tháng: {{price_monthly}} VNĐ. Tiền đặt cọc: {{deposit_amount}} VNĐ." },
                { heading: "Điều 4: Thời hạn thuê", body: "Hợp đồng có hiệu lực từ ngày {{start_date}} đến ngày {{end_date}}." },
            ],
            reviewNotice: "Mẫu hợp đồng pháp lý chuẩn đã được rà soát.",
        },
    },
    {
        id: contractTemplateId(2),
        providerId: null,
        name: "Hợp đồng cung cấp dịch vụ (Dân sự)",
        description: "Mẫu hợp đồng cung cấp dịch vụ tiện ích, vệ sinh, sửa chữa dành cho nhà cung cấp dịch vụ.",
        content: {
            version: "2.0",
            documentType: "SERVICE_AGREEMENT",
            legalReferences: ["Bộ luật Dân sự số 91/2015/QH13"],
            sections: [
                { heading: "Căn cứ pháp lý", body: "Theo Luật Dân sự hiện hành." },
                { heading: "Các bên", body: "Bên Cung Cấp: {{provider_name}}. Bên Sử Dụng: {{customer_name}}." },
                { heading: "Dịch vụ và thanh toán", body: "Cung cấp dịch vụ tại {{property_address}}. Thời hạn từ {{start_date}} đến {{end_date}}." },
            ],
            reviewNotice: "Dành cho các giao dịch dịch vụ lẻ hoặc định kỳ.",
        },
    }
] as const;

async function main() {
    // 1. CLEAR OLD DEV SEEDS TO PREVENT CONFLICTS
    await prisma.contractTerm.deleteMany();
    await prisma.term.deleteMany();
    await prisma.contractTemplate.deleteMany();
    await prisma.templateVariable.deleteMany();
    await prisma.billingPeriod.deleteMany();
    await prisma.contractService.deleteMany();
    await prisma.contractFile.deleteMany();
    await prisma.violationEvidence.deleteMany();
    await prisma.violationAction.deleteMany();
    await prisma.restriction.deleteMany();
    await prisma.violationAppeal.deleteMany();
    await prisma.violationCase.deleteMany();
    await prisma.violationRule.deleteMany();
    await prisma.contract.deleteMany();

    // 2. TERMS & VARIABLES
    await prisma.term.createMany({
        data: activeTerms.map((content, index) => ({ id: termId(index + 1), content, status: "ACTIVE", createdAt: now })),
        skipDuplicates: true
    });
    
    await prisma.contractTemplate.createMany({
        data: contractTemplates.map(t => ({ ...t, status: "ACTIVE", createdAt: now, updatedAt: now })),
        skipDuplicates: true
    });

    await prisma.templateVariable.createMany({
        data: templateVariables.map(([key, label, groupName], index) => ({ id: templateVariableId(index + 1), key, label, groupName })),
        skipDuplicates: true
    });

    // 3. GENERATE 150 CONTRACTS
    // Housing contracts: providers 1, 2, 3, 12, 13, 16
    const housingProviders = [1, 2, 3, 12, 13, 16];
    const contracts = [];
    
    for (let i = 0; i < 150; i++) {
        // Random customer 101-150
        const custId = userId(101 + (i % 50));
        // Distribute to housing providers
        const provId = providerId(housingProviders[i % housingProviders.length]);
        
        // Trạng thái hợp đồng (thực tế)
        const statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "PENDING_SIGNATURE", "EXPIRED", "TERMINATED"];
        const status = statuses[i % statuses.length];
        
        let start = new Date(2025 + (i % 2), i % 12, 1);
        let end = new Date(start.getTime());
        end.setFullYear(end.getFullYear() + 1);
        if (status === "EXPIRED") end = new Date(Date.now() - 86400000 * 30);
        if (status === "TERMINATED") end = new Date(Date.now() - 86400000 * 10);
        
        const cId = contract(i + 1);
        contracts.push({
            id: cId,
            contractNumber: `HD-2026-${String(i + 1).padStart(4, "0")}`,
            providerId: provId,
            roomId: roomId((i % 1200) + 1), // Liên kết ngẫu nhiên tới phòng 1-1200
            customerId: custId,
            startDate: start,
            endDate: end,
            status: status as any,
            requireSignature: status === "PENDING_SIGNATURE",
            signedAt: status === "PENDING_SIGNATURE" ? null : new Date(start.getTime() + 86400000),
            createdAt: start,
            updatedAt: start,
        });
    }

    // Chunk saving
    for (let i = 0; i < contracts.length; i += 50) {
        await prisma.contract.createMany({ data: contracts.slice(i, i + 50), skipDuplicates: true });
    }

    // 4. CONTRACT SERVICES (Link price IDs)
    // Housing service price IDs are 2*serviceIdx - 1. In catalog, Housing services are idx 1, 4, 7... 88
    // Electricity is 2, 5, 8... Water is 3, 6, 9...
    const cServices = [];
    for (let i = 0; i < 150; i++) {
        const cId = contract(i + 1);
        // Map contract index to property index (0-29)
        const propIdx = i % 30;
        const housingServiceIdx = propIdx * 3 + 1;
        const elecServiceIdx = propIdx * 3 + 2;
        const waterServiceIdx = propIdx * 3 + 3;

        cServices.push({ id: contractService(i * 3 + 1), contractId: cId, servicePriceId: servicePrice(housingServiceIdx * 2 - 1), quantity: "1", createdAt: contracts[i].createdAt });
        cServices.push({ id: contractService(i * 3 + 2), contractId: cId, servicePriceId: servicePrice(elecServiceIdx * 2 - 1), quantity: "1", createdAt: contracts[i].createdAt });
        cServices.push({ id: contractService(i * 3 + 3), contractId: cId, servicePriceId: servicePrice(waterServiceIdx * 2 - 1), quantity: "1", createdAt: contracts[i].createdAt });
    }
    
    for (let i = 0; i < cServices.length; i += 100) {
        await prisma.contractService.createMany({ data: cServices.slice(i, i + 100), skipDuplicates: true });
    }

    // 5. BILLING PERIODS (12 periods per active contract)
    const periods = [];
    for (let i = 0; i < 150; i++) {
        if (contracts[i].status !== "ACTIVE") continue;
        const startMonth = contracts[i].startDate.getMonth() + 1;
        const year = contracts[i].startDate.getFullYear();
        
        for (let m = 0; m < 12; m++) {
            const periodMonth = ((startMonth - 1 + m) % 12) + 1;
            const periodYear = year + Math.floor((startMonth - 1 + m) / 12);
            periods.push({
                id: periodId(i * 12 + m + 1),
                contractId: contracts[i].id,
                periodStart: new Date(periodYear, periodMonth - 1, 1),
                periodEnd: new Date(periodYear, periodMonth, 0),
                createdAt: now,
                updatedAt: now,
            });
        }
    }
    
    for (let i = 0; i < periods.length; i += 300) {
        await prisma.billingPeriod.createMany({ data: periods.slice(i, i + 300), skipDuplicates: true });
    }

    // 6. CONTRACT TERMS
    const contractTerms = [];
    for (let i = 0; i < 150; i++) {
        for (let t = 0; t < 12; t++) {
            contractTerms.push({
                id: contractTermId(i * 12 + t + 1),
                contractId: contract(i + 1),
                termId: termId(t + 1),
                createdAt: now,
            });
        }
    }
    for (let i = 0; i < contractTerms.length; i += 500) {
        await prisma.contractTerm.createMany({ data: contractTerms.slice(i, i + 500), skipDuplicates: true });
    }

    // 7. VIOLATION RULES & CASES
    await prisma.violationRule.createMany({
        data: [
            { id: violationRuleId(1), name: "Thanh toán trễ hạn quá 15 ngày", description: "Bên Thuê chậm thanh toán", targetType: "CUSTOMER", isActive: true, createdAt: now, updatedAt: now },
            { id: violationRuleId(2), name: "Gây ồn ào, mất trật tự sau 22h", description: "Bên Thuê vi phạm nội quy", targetType: "CUSTOMER", isActive: true, createdAt: now, updatedAt: now },
            { id: violationRuleId(3), name: "Cung cấp dịch vụ sai cam kết", description: "Bên Cho Thuê giao nhà không đúng hiện trạng", targetType: "PROVIDER", isActive: true, createdAt: now, updatedAt: now },
        ],
        skipDuplicates: true
    });

    const cases = [];
    for (let i = 0; i < 30; i++) {
        cases.push({
            id: violationCaseId(i + 1),
            violationRuleId: violationRuleId((i % 3) + 1),
            contractId: contract(i + 1),
            providerId: providerId(housingProviders[i % housingProviders.length]),
            reportedBy: i % 2 === 0 ? userId(101 + i) : userId(1), // Customer or Admin
            serviceId: serviceId((i % 30) * 3 + 1),
            status: ["REPORTED", "RESOLVED", "REJECTED"][i % 3] as any,
            description: "Hành vi vi phạm được hệ thống ghi nhận.",
            occurredAt: new Date(Date.now() - i * 86400000),
            createdAt: now,
            updatedAt: now,
        });
    }
    await prisma.violationCase.createMany({ data: cases, skipDuplicates: true });

    console.log(`Đã seed contract-service: ${contracts.length} hợp đồng, ${periods.length} kỳ thanh toán, ${contractTerms.length} điều khoản ký kết.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
