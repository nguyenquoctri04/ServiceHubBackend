import { PrismaClient } from "@prisma/client-contract";
import * as crypto from "crypto";

const prisma = new PrismaClient();
const now = new Date();

// Cross-service UUID generators (Đồng bộ chuẩn 100% với identity, catalog, billing, notification, audit)
const userId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const providerId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const serviceId = (n: number) => `61000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const priceId = (n: number) => `62000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const roomId = (n: number) => `6b000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const contract = (n: number) => `70000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const periodId = (n: number) => `71000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const contractService = (n: number) => `72000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fileId = (n: number) => `73000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const termId = (n: number) => `74000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const contractTermId = (n: number) => `75000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const violationRuleId = (n: number) => `76000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const violationCaseId = (n: number) => `77000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const evidenceId = (n: number) => `78000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actionId = (n: number) => `79000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const restrictionId = (n: number) => `7a000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const appealId = (n: number) => `7b000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const contractTemplateId = (n: number) => `7c000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const templateVariableId = (n: number) => `7d000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// Helper tạo mã hash SHA-256 thật cho hợp đồng
const sha256 = (str: string) => crypto.createHash("sha256").update(str).digest("hex");

// 12 Điều khoản hợp đồng chuẩn pháp lý Việt Nam 2024-2026
const activeTerms = [
    "Điều 1 (Căn cứ pháp lý): Căn cứ Bộ luật Dân sự 2015, Luật Nhà ở 2023, Luật Kinh doanh bất động sản 2023, Luật Bảo vệ quyền lợi người tiêu dùng 2023 và Luật Giao dịch điện tử 2023.",
    "Điều 2 (Mục đích thuê): Bên Thuê cam kết sử dụng mặt bằng/phòng ở đúng mục đích để ở và sinh hoạt hợp pháp, không sử dụng vào mục đích kinh doanh trái phép hoặc tàng trữ chất cấm.",
    "Điều 3 (Giá thuê và phương thức thanh toán): Giá thuê cố định trong suốt thời hạn hiệu lực hợp đồng. Tiền thuê được thanh toán định kỳ hàng tháng từ ngày 01 đến ngày 05 của kỳ thanh toán qua cổng thanh toán ServiceHub.",
    "Điều 4 (Tiền đặt cọc): Bên Thuê thanh toán tiền cọc tương đương 01 hoặc 02 tháng tiền nhà để bảo đảm thực hiện hợp đồng. Tiền cọc được hoàn trả đầy đủ sau khi thanh lý hợp đồng và bàn giao hiện trạng nguyên vẹn.",
    "Điều 5 (Bàn giao và nghiệm thu): Bên Cho Thuê bàn giao tài sản đúng tình trạng cam kết kèm biên bản kiểm kê thiết bị. Bên Thuê có nghĩa vụ giữ gìn, bảo quản tài sản chung và riêng trong suốt quá trình lưu trú.",
    "Điều 6 (Quyền và nghĩa vụ Bên Cho Thuê): Cung cấp dịch vụ đúng chất lượng, bảo đảm quyền sử dụng riêng tư cho Bên Thuê; có quyền đơn phương tạm ngưng dịch vụ nếu Bên Thuê chậm thanh toán quá 15 ngày.",
    "Điều 7 (Quyền và nghĩa vụ Bên Thuê): Chấp hành nghiêm chỉnh nội quy tòa nhà, quy định phòng cháy chữa cháy (PCCC) và giữ gìn an ninh trật tự công cộng sau 22h00.",
    "Điều 8 (Bảo vệ dữ liệu cá nhân theo NĐ 13/2023/NĐ-CP): Các bên cam kết bảo mật tuyệt đối thông tin cá nhân và dữ liệu số định danh; chỉ sử dụng thông tin nhằm mục đích phục vụ hợp đồng này.",
    "Điều 9 (Bất khả kháng): Khi xảy ra thiên tai, dịch bệnh hoặc các quyết định hành chính cưỡng chế của cơ quan Nhà nước có thẩm quyền, các bên được miễn trừ trách nhiệm bồi thường trong thời gian diễn ra sự kiện.",
    "Điều 10 (Đơn phương chấm dứt và phạt vi phạm): Bên nào muốn chấm dứt trước hạn phải báo trước bằng văn bản ít nhất 30 ngày. Vi phạm thông báo phải bồi thường khoản tiền tương đương tiền cọc.",
    "Điều 11 (Giải quyết tranh chấp): Mọi bất đồng trước hết được giải quyết thông qua thương lượng và hòa giải trên hệ thống ServiceHub. Trường hợp không đạt được thỏa thuận, vụ việc sẽ do Tòa án nhân dân có thẩm quyền giải quyết.",
    "Điều 12 (Giá trị pháp lý hợp đồng điện tử): Hợp đồng này được xác lập dưới dạng thông điệp dữ liệu điện tử, có chữ ký số xác thực và mã hash toàn vẹn, có giá trị pháp lý tương đương bản gốc bằng văn bản giấy."
];

// Biến mẫu hợp đồng
const templateVariables = [
    ["provider_name", "Tên Nhà Cung Cấp / Cho Thuê", "Bên Cung Cấp"],
    ["provider_tax_code", "Mã số thuế / Số ĐKKD", "Bên Cung Cấp"],
    ["provider_address", "Địa chỉ trụ sở Bên Cho Thuê", "Bên Cung Cấp"],
    ["provider_representative", "Người đại diện theo pháp luật", "Bên Cung Cấp"],
    ["customer_name", "Họ và tên Khách Hàng", "Bên Sử Dụng"],
    ["customer_cccd", "Số CCCD gắn chíp / Hộ chiếu", "Bên Sử Dụng"],
    ["customer_phone", "Số điện thoại liên hệ", "Bên Sử Dụng"],
    ["customer_address", "Địa chỉ thường trú", "Bên Sử Dụng"],
    ["property_name", "Tên Bất động sản / Tòa nhà", "Thông Tin Dịch Vụ"],
    ["room_number", "Số phòng / Mã căn hộ", "Thông Tin Dịch Vụ"],
    ["start_date", "Ngày bắt đầu hiệu lực", "Thời Hạn"],
    ["end_date", "Ngày kết thúc hợp đồng", "Thời Hạn"],
    ["monthly_amount", "Số tiền thanh toán mỗi kỳ", "Tài Chính"],
    ["deposit_amount", "Số tiền bảo đảm (Tiền cọc)", "Tài Chính"],
];

// 3 Mẫu hợp đồng chuẩn hệ thống
const contractTemplates = [
    {
        id: contractTemplateId(1),
        providerId: null,
        name: "Hợp đồng thuê nhà ở & căn hộ (Chuẩn Luật Nhà ở 2023)",
        description: "Mẫu hợp đồng pháp lý đầy đủ cho thuê bất động sản, căn hộ dịch vụ và phòng trọ lưu trú dài hạn.",
        content: {
            templateCode: "HD-HOUSING-V2",
            documentTitle: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nHỢP ĐỒNG THUÊ NHÀ Ở",
            sections: [
                { title: "BÊN CHO THUÊ (BÊN A)", content: "Tên tổ chức/cá nhân: {{provider_name}}\nMST: {{provider_tax_code}}\nĐịa chỉ: {{provider_address}}\nĐại diện: {{provider_representative}}" },
                { title: "BÊN THUÊ (BÊN B)", content: "Họ và tên: {{customer_name}}\nCCCD: {{customer_cccd}}\nSĐT: {{customer_phone}}\nĐịa chỉ thường trú: {{customer_address}}" },
                { title: "ĐIỀU 1. ĐỐI TƯỢNG VÀ THỜI HẠN THUÊ", content: "Bên A cho Bên B thuê căn hộ số {{room_number}} tại {{property_name}}.\nThời hạn thuê từ ngày {{start_date}} đến hết ngày {{end_date}}." },
                { title: "ĐIỀU 2. GIÁ THUÊ VÀ ĐẶT CỌC", content: "Giá thuê hàng tháng: {{monthly_amount}} VNĐ/tháng.\nTiền bảo đảm hợp đồng: {{deposit_amount}} VNĐ." },
            ],
            requiresSignature: true,
        },
    },
    {
        id: contractTemplateId(2),
        providerId: null,
        name: "Hợp đồng dịch vụ tiện ích định kỳ (Điện, Nước, Quản lý)",
        description: "Hợp đồng dịch vụ tiện ích thiết yếu sinh hoạt gắn liền theo phòng hoặc sử dụng định kỳ hàng tháng.",
        content: {
            templateCode: "HD-UTILITY-V2",
            documentTitle: "THỎA THUẬN CUNG CẤP DỊCH VỤ TIỆN ÍCH SINH HOẠT",
            sections: [
                { title: "ĐƠN VỊ CUNG CẤP", content: "{{provider_name}} - MST: {{provider_tax_code}}" },
                { title: "KHÁCH HÀNG SỬ DỤNG", content: "{{customer_name}} - Phòng {{room_number}}, {{property_name}}" },
                { title: "PHẠM VI CUNG CẤP", content: "Cung cấp điện, nước sinh hoạt, mạng viễn thông theo bảng đơn giá niêm yết công khai trên hệ thống ServiceHub." },
            ],
            requiresSignature: false,
        },
    },
    {
        id: contractTemplateId(3),
        providerId: null,
        name: "Hợp đồng dịch vụ ngoài & Hợp tác bên thứ ba",
        description: "Mẫu hợp đồng dành cho các đơn vị dịch vụ giặt ủi, dọn dẹp, bảo trì, ăn uống và vận tải.",
        content: {
            templateCode: "HD-EXTERNAL-V2",
            documentTitle: "HỢP ĐỒNG CUNG CẤP DỊCH VỤ THƯƠNG MẠI",
            sections: [
                { title: "BÊN CUNG CẤP DỊCH VỤ", content: "{{provider_name}} - Người đại diện: {{provider_representative}}" },
                { title: "BÊN SỬ DỤNG DỊCH VỤ", content: "{{customer_name}} - CCCD: {{customer_cccd}} - SĐT: {{customer_phone}}" },
                { title: "ĐIỀU KHOẢN DỊCH VỤ", content: "Cung cấp gói dịch vụ chuyên nghiệp theo đúng mô tả, thời gian và cam kết chất lượng đã đăng ký." },
            ],
            requiresSignature: true,
        },
    },
];

// 6 Quy tắc xử lý vi phạm thực tế
const violationRulesData = [
    { id: 1, name: "Chậm thanh toán tiền thuê/dịch vụ quá 15 ngày", desc: "Khách hàng không hoàn tất nghĩa vụ tài chính đúng hạn quy định.", target: "CUSTOMER" as const },
    { id: 2, name: "Gây ồn ào mất trật tự sau 22h00 đêm", desc: "Vi phạm nội quy sinh hoạt chung của khu dân cư hoặc ký túc xá.", target: "CUSTOMER" as const },
    { id: 3, name: "Tự ý sang nhượng hoặc cho người lạ lưu trú", desc: "Không đăng ký lưu trú với cơ quan quản lý và nhà cung cấp.", target: "CUSTOMER" as const },
    { id: 4, name: "Bàn giao phòng/thiết bị sai hiện trạng cam kết", desc: "Nhà cung cấp giao phòng không đúng mô tả hoặc thiết bị hư hỏng.", target: "PROVIDER" as const },
    { id: 5, name: "Tự ý cắt điện nước hoặc dịch vụ không thông báo", desc: "Nhà cung cấp vi phạm nghĩa vụ cung ứng tiện ích thiết yếu.", target: "PROVIDER" as const },
    { id: 6, name: "Hủy lịch hẹn dịch vụ đột xuất dưới 2 giờ", desc: "Bên cung cấp hoặc khách hàng tự ý hủy lịch gây tổn thất thời gian.", target: "BOTH" as const },
];

async function main() {
    console.log("--> Đang seed Contract Service...");

    // 1. CLEAR DỮ LIỆU CŨ THEO ĐÚNG THỨ TỰ PHỤ THUỘC
    await prisma.violationAppeal.deleteMany();
    await prisma.restriction.deleteMany();
    await prisma.violationAction.deleteMany();
    await prisma.violationEvidence.deleteMany();
    await prisma.violationCase.deleteMany();
    await prisma.violationRule.deleteMany();

    await prisma.contractTerm.deleteMany();
    await prisma.term.deleteMany();
    await prisma.contractFile.deleteMany();
    await prisma.contractService.deleteMany();
    await prisma.billingPeriod.deleteMany();
    await prisma.contract.deleteMany();

    await prisma.templateVariable.deleteMany();
    await prisma.contractTemplate.deleteMany();

    // 2. TẠO CÁC ĐIỀU KHOẢN, MẪU HỢP ĐỒNG & BIẾN MẪU
    await prisma.term.createMany({
        data: activeTerms.map((content, idx) => ({
            id: termId(idx + 1),
            content,
            status: "ACTIVE" as const,
            createdAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.contractTemplate.createMany({
        data: contractTemplates.map(t => ({
            id: t.id,
            providerId: t.providerId,
            name: t.name,
            description: t.description,
            content: t.content,
            status: "ACTIVE" as const,
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.templateVariable.createMany({
        data: templateVariables.map(([key, label, groupName], idx) => ({
            id: templateVariableId(idx + 1),
            key,
            label,
            groupName,
        })),
        skipDuplicates: true,
    });

    // 3. TẠO 160 HỢP ĐỒNG VỚI ĐỦ CÁC TRƯỜNG HỢP VÒNG ĐỜI
    // 120 Hợp đồng BĐS / Housing (Provider 1 -> 10)
    // 40 Hợp đồng Dịch vụ ngoài (Provider 11 -> 25)
    const contractInserts = [];
    const contractFileInserts = [];
    const contractServiceInserts = [];
    const contractTermInserts = [];
    const billingPeriodInserts = [];

    let contractCounter = 1;
    let fileCounter = 1;
    let cServiceCounter = 1;
    let cTermCounter = 1;
    let periodCounter = 1;

    // --- A. 120 HỢP ĐỒNG HOUSING (Có roomId) ---
    // Phân bổ: 10 Provider BĐS x 12 hợp đồng
    for (let pNum = 1; pNum <= 10; pNum++) {
        for (let cIdx = 1; cIdx <= 12; cIdx++) {
            const currentContractNum = contractCounter;
            const cId = contract(currentContractNum);
            const custId = userId(101 + ((currentContractNum - 1) % 60)); // Khách hàng 101 -> 160
            const assignedRoomId = roomId(((pNum - 1) * 40) + cIdx); // Ghép vào 1 phòng thực tế của BĐS

            // Trạng thái hợp đồng phân bổ thực tế:
            // cIdx 1: DRAFT do khách hàng tạo yêu cầu dịch vụ (YCDV-...)
            // cIdx 2: DRAFT do provider đã duyệt và đang hoàn thiện thông tin (HD-...)
            // cIdx 3, 4: PENDING_SIGNATURE (Chờ ký số, có PDF & SHA-256 hash)
            // cIdx 5..9: ACTIVE (Đang có hiệu lực, đã ký số GPG, có PDF & hash)
            // cIdx 10: ACTIVE (Không yêu cầu ký số)
            // cIdx 11: EXPIRED (Hết hạn lưu trú)
            // cIdx 12: TERMINATED (Chấm dứt trước hạn do vi phạm hoặc thỏa thuận)
            let status: "DRAFT" | "PENDING_SIGNATURE" | "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "TERMINATED" = "ACTIVE";
            let requireSignature = true;
            let contractCode = `HD-2026-${String(currentContractNum).padStart(4, "0")}`;
            let signedAt: Date | null = new Date("2026-01-05T10:00:00Z");
            let startDate = new Date("2026-01-01");
            let endDate: Date | null = new Date("2026-12-31");

            if (cIdx === 1) {
                status = "DRAFT";
                contractCode = `YCDV-2026-${String(currentContractNum).padStart(4, "0")}`;
                signedAt = null;
                startDate = new Date("2026-03-01");
                endDate = new Date("2027-02-28");
            } else if (cIdx === 2) {
                status = "DRAFT";
                signedAt = null;
                startDate = new Date("2026-02-15");
                endDate = new Date("2027-02-14");
            } else if (cIdx === 3) {
                status = "PENDING_SIGNATURE";
                signedAt = null;
                startDate = new Date("2026-02-01");
                endDate = new Date("2027-01-31");
            } else if (cIdx === 4) {
                status = "PENDING_PAYMENT";
                signedAt = new Date("2026-02-03T08:30:00Z");
                startDate = new Date("2026-02-01");
                endDate = new Date("2027-01-31");
            } else if (cIdx === 10) {
                status = "ACTIVE";
                requireSignature = false;
                signedAt = null; // Không cần ký
                startDate = new Date("2025-09-01");
                endDate = new Date("2026-08-31");
            } else if (cIdx === 11) {
                status = "EXPIRED";
                startDate = new Date("2024-01-01");
                endDate = new Date("2024-12-31");
                signedAt = new Date("2024-01-02");
            } else if (cIdx === 12) {
                status = "TERMINATED";
                startDate = new Date("2025-06-01");
                endDate = new Date("2025-11-15");
                signedAt = new Date("2025-06-02");
            }

            contractInserts.push({
                id: cId,
                contractNumber: contractCode,
                providerId: providerId(pNum),
                roomId: assignedRoomId,
                customerId: custId,
                startDate,
                endDate,
                status,
                requireSignature,
                signedAt,
                createdAt: startDate,
                updatedAt: signedAt || startDate,
            });

            // Gắn ContractFile cho mọi hợp đồng từ PENDING_SIGNATURE, ACTIVE, EXPIRED, TERMINATED
            if (status !== "DRAFT") {
                const pdfFileUrl = `https://storage.servicehub.vn/contracts/${contractCode}.pdf`;
                const pdfHash = sha256(`SERVICEHUB-CONTRACT-HASH-${contractCode}-${cId}`);

                contractFileInserts.push({
                    id: fileId(fileCounter++),
                    contractId: cId,
                    pdfUrl: pdfFileUrl,
                    hashContract: pdfHash,
                });
            }

            // Gắn dịch vụ thuê nhà + điện nước kèm theo (ServicePrice chuẩn từ catalog)
            const housingPriceId = priceId((pNum - 1) * 3 + 1);
            const elecPriceId = priceId((pNum - 1) * 3 + 2);
            const waterPriceId = priceId((pNum - 1) * 3 + 3);

            contractServiceInserts.push({
                id: contractService(cServiceCounter++),
                contractId: cId,
                servicePriceId: housingPriceId,
                quantity: "1.00" as any,
                createdAt: startDate,
            });
            contractServiceInserts.push({
                id: contractService(cServiceCounter++),
                contractId: cId,
                servicePriceId: elecPriceId,
                quantity: "1.00" as any,
                createdAt: startDate,
            });
            contractServiceInserts.push({
                id: contractService(cServiceCounter++),
                contractId: cId,
                servicePriceId: waterPriceId,
                quantity: "1.00" as any,
                createdAt: startDate,
            });

            // Gắn 12 điều khoản pháp lý
            for (let t = 1; t <= 12; t++) {
                contractTermInserts.push({
                    id: contractTermId(cTermCounter++),
                    contractId: cId,
                    termId: termId(t),
                    createdAt: startDate,
                });
            }

            // Gắn 12 kỳ thanh toán cho các hợp đồng ACTIVE & EXPIRED
            if (status === "ACTIVE" || status === "EXPIRED") {
                for (let m = 0; m < 12; m++) {
                    const startYear = startDate.getFullYear();
                    const startMonth = startDate.getMonth() + m;
                    const pStart = new Date(startYear, startMonth, 1);
                    const pEnd = new Date(startYear, startMonth + 1, 0);

                    billingPeriodInserts.push({
                        id: periodId(periodCounter++),
                        contractId: cId,
                        periodStart: pStart,
                        periodEnd: pEnd,
                        createdAt: pStart,
                        updatedAt: pStart,
                    });
                }
            }

            contractCounter++;
        }
    }

    // --- B. 40 HỢP ĐỒNG DỊCH VỤ NGOÀI (EXTERNAL SERVICES, roomId: null) ---
    // Phân bổ cho các nhà cung cấp 11 -> 25
    for (let extIdx = 1; extIdx <= 40; extIdx++) {
        const currentContractNum = contractCounter;
        const cId = contract(currentContractNum);
        const pNum = 11 + ((extIdx - 1) % 15); // Provider 11 -> 25
        const custId = userId(101 + ((extIdx * 3) % 60));

        let status: "DRAFT" | "PENDING_SIGNATURE" | "PENDING_PAYMENT" | "ACTIVE" | "CANCELLED" = "ACTIVE";
        let contractCode = `HD-DV-${String(currentContractNum).padStart(4, "0")}`;
        let startDate = new Date("2026-01-10");
        let endDate: Date | null = new Date("2026-07-10");
        let signedAt: Date | null = new Date("2026-01-11T09:30:00Z");

        if (extIdx <= 5) {
            status = "DRAFT";
            contractCode = `YCDV-${String(currentContractNum).padStart(4, "0")}`;
            signedAt = null;
        } else if (extIdx <= 8) {
            status = "PENDING_SIGNATURE";
            signedAt = null;
        } else if (extIdx <= 10) {
            status = "PENDING_PAYMENT";
            signedAt = new Date("2026-01-11T09:30:00Z");
        } else if (extIdx > 35) {
            status = "CANCELLED";
            signedAt = null;
            endDate = new Date("2026-01-15");
        }

        contractInserts.push({
            id: cId,
            contractNumber: contractCode,
            providerId: providerId(pNum),
            roomId: null, // Không có room_id vì là external service
            customerId: custId,
            startDate,
            endDate,
            status,
            requireSignature: true,
            signedAt,
            createdAt: startDate,
            updatedAt: signedAt || startDate,
        });

        if (status !== "DRAFT") {
            const pdfFileUrl = `https://storage.servicehub.vn/contracts/${contractCode}.pdf`;
            const pdfHash = sha256(`SERVICEHUB-EXT-CONTRACT-HASH-${contractCode}-${cId}`);

            contractFileInserts.push({
                id: fileId(fileCounter++),
                contractId: cId,
                pdfUrl: pdfFileUrl,
                hashContract: pdfHash,
            });
        }

        // Gắn ServicePrice từ catalog (External services có priceId từ 31 trở đi)
        const extPriceId = priceId(30 + ((pNum - 11) * 2) + 1);
        contractServiceInserts.push({
            id: contractService(cServiceCounter++),
            contractId: cId,
            servicePriceId: extPriceId,
            quantity: "1.00" as any,
            createdAt: startDate,
        });

        // Gắn điều khoản chuẩn
        for (let t = 1; t <= 4; t++) {
            contractTermInserts.push({
                id: contractTermId(cTermCounter++),
                contractId: cId,
                termId: termId(t),
                createdAt: startDate,
            });
        }

        if (status === "ACTIVE") {
            for (let m = 0; m < 6; m++) {
                const pStart = new Date(2026, m, 1);
                const pEnd = new Date(2026, m + 1, 0);
                billingPeriodInserts.push({
                    id: periodId(periodCounter++),
                    contractId: cId,
                    periodStart: pStart,
                    periodEnd: pEnd,
                    createdAt: pStart,
                    updatedAt: pStart,
                });
            }
        }

        contractCounter++;
    }

    // Insert Contracts theo chunks
    for (let i = 0; i < contractInserts.length; i += 50) {
        await prisma.contract.createMany({ data: contractInserts.slice(i, i + 50), skipDuplicates: true });
    }
    await prisma.contractFile.createMany({ data: contractFileInserts, skipDuplicates: true });

    for (let i = 0; i < contractServiceInserts.length; i += 100) {
        await prisma.contractService.createMany({ data: contractServiceInserts.slice(i, i + 100), skipDuplicates: true });
    }
    for (let i = 0; i < contractTermInserts.length; i += 300) {
        await prisma.contractTerm.createMany({ data: contractTermInserts.slice(i, i + 300), skipDuplicates: true });
    }
    for (let i = 0; i < billingPeriodInserts.length; i += 300) {
        await prisma.billingPeriod.createMany({ data: billingPeriodInserts.slice(i, i + 300), skipDuplicates: true });
    }

    // 4. VIOLATION RULES & CASES & ACTIONS & EVIDENCE & RESTRICTIONS & APPEALS
    await prisma.violationRule.createMany({
        data: violationRulesData.map(r => ({
            id: violationRuleId(r.id),
            name: r.name,
            description: r.desc,
            targetType: r.target,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    const caseInserts = [];
    const evidenceInserts = [];
    const actionInserts = [];
    const restrictionInserts = [];
    const appealInserts = [];

    let caseCounter = 1;
    let evidenceCounter = 1;
    let actionCounter = 1;
    let restCounter = 1;
    let appealCounter = 1;

    // Tạo 24 vụ vi phạm thực tế
    for (let c = 1; c <= 24; c++) {
        const caseDbId = violationCaseId(caseCounter);
        const ruleIdx = ((c - 1) % 6) + 1;
        const ruleDbId = violationRuleId(ruleIdx);
        const relatedContractId = contract(c);
        const pNum = ((c - 1) % 10) + 1;
        const provId = providerId(pNum);

        // Quy tắc 1, 2, 3: Target là CUSTOMER (Khách hàng vi phạm -> Provider hoặc Admin/Hệ thống phát hiện)
        // Quy tắc 4, 5: Target là PROVIDER (Nhà cung cấp vi phạm -> Khách hàng báo cáo)
        // Quy tắc 6: Target là BOTH (Hủy lịch hẹn đột xuất)
        let repBy = userId(1);
        if (ruleIdx <= 3) {
            repBy = c % 2 === 0 ? userId(201 + (pNum - 1)) : userId(1);
        } else if (ruleIdx === 4 || ruleIdx === 5) {
            repBy = userId(101 + c);
        } else {
            repBy = c % 2 === 0 ? userId(201 + (pNum - 1)) : userId(101 + c);
        }

        // Đủ 4 trạng thái: REPORTED, RESOLVED, REJECTED, CANCELLED
        let caseStatus: "REPORTED" | "RESOLVED" | "REJECTED" | "CANCELLED" = "RESOLVED";
        if (c <= 6) caseStatus = "REPORTED";
        else if (c <= 18) caseStatus = "RESOLVED";
        else if (c <= 21) caseStatus = "REJECTED";
        else caseStatus = "CANCELLED";

        caseInserts.push({
            id: caseDbId,
            violationRuleId: ruleDbId,
            contractId: relatedContractId,
            providerId: provId,
            reportedBy: repBy,
            serviceId: serviceId(((c - 1) * 3) + 1),
            status: caseStatus,
            description: `Ghi nhận vụ việc số ${c}: Vi phạm quy chuẩn an toàn và cam kết theo điều khoản hợp đồng.`,
            occurredAt: new Date(Date.now() - (c * 86400000 * 2)),
            createdAt: now,
            updatedAt: now,
        });

        // Bằng chứng vi phạm (Violation Evidence)
        evidenceInserts.push({
            id: evidenceId(evidenceCounter++),
            violationCaseId: caseDbId,
            fileUrl: `https://storage.servicehub.vn/evidence/case-${c}-photo1.jpg`,
        });
        if (c % 2 === 0) {
            evidenceInserts.push({
                id: evidenceId(evidenceCounter++),
                violationCaseId: caseDbId,
                fileUrl: `https://storage.servicehub.vn/evidence/case-${c}-record.pdf`,
            });
        }

        // Biện pháp xử lý kỷ luật nếu RESOLVED
        if (caseStatus === "RESOLVED") {
            const actDbId = actionId(actionCounter++);
            const actionTypes: Array<"WARNING" | "FINE" | "RESTRICT" | "REQUEST_CORRECTION"> = ["WARNING", "FINE", "RESTRICT", "REQUEST_CORRECTION"];
            const chosenAction = actionTypes[c % 4];

            actionInserts.push({
                id: actDbId,
                violationCaseId: caseDbId,
                performedBy: userId(1), // Admin xử lý
                actionType: chosenAction,
                reason: `Đã xác minh đầy đủ chứng cứ. Áp dụng chế tài: ${chosenAction}.`,
                amount: chosenAction === "FINE" ? ("500000.00" as any) : null,
                createdAt: now,
            });

            // Nếu chế tài là RESTRICT -> Tạo Restriction
            if (chosenAction === "RESTRICT") {
                restrictionInserts.push({
                    id: restrictionId(restCounter++),
                    violationActionId: actDbId,
                    providerId: provId,
                    customerId: userId(101 + c),
                    serviceId: null,
                    scopeType: "PLATFORM" as const,
                    reason: "Tạm khóa quyền tạo hợp đồng mới trong 14 ngày do vi phạm nội quy.",
                    startAt: now,
                    endAt: new Date(Date.now() + 14 * 86400000),
                    createdBy: userId(1),
                    isDeleted: false,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            // Tạo Khiếu nại (Appeal) cho các vụ đã xử phạt
            if (c % 2 === 0) {
                const appealStatuses: Array<"PENDING" | "APPROVED" | "REJECTED"> = ["PENDING", "APPROVED", "REJECTED"];
                const appStatus = appealStatuses[(c / 2) % 3];

                appealInserts.push({
                    id: appealId(appealCounter++),
                    violationCaseId: caseDbId,
                    appellantId: userId(101 + c),
                    reviewedBy: appStatus !== "PENDING" ? userId(1) : null,
                    reason: "Tôi đã khắc phục hoàn toàn sự cố và xin giảm mức xử lý kỷ luật.",
                    status: appStatus,
                    reviewedAt: appStatus !== "PENDING" ? now : null,
                    resolutionNote: appStatus === "APPROVED" ? "Chấp nhận giải trình, dỡ bỏ hạn chế." : (appStatus === "REJECTED" ? "Chứng cứ giải trình không hợp lệ, giữ nguyên án phạt." : null),
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        caseCounter++;
    }

    await prisma.violationCase.createMany({ data: caseInserts, skipDuplicates: true });
    await prisma.violationEvidence.createMany({ data: evidenceInserts, skipDuplicates: true });
    await prisma.violationAction.createMany({ data: actionInserts, skipDuplicates: true });
    await prisma.restriction.createMany({ data: restrictionInserts, skipDuplicates: true });
    await prisma.violationAppeal.createMany({ data: appealInserts, skipDuplicates: true });

    console.log(`✅ Seed Contract Service thành công:`);
    console.log(`   - ${contractInserts.length} Hợp đồng (120 BĐS & 40 Dịch vụ ngoài, đủ mọi trạng thái vòng đời).`);
    console.log(`   - ${contractFileInserts.length} File PDF ký kết kèm mã hash SHA-256 thực tế.`);
    console.log(`   - ${billingPeriodInserts.length} Kỳ thanh toán định kỳ.`);
    console.log(`   - ${contractTermInserts.length} Điều khoản pháp lý gắn hợp đồng.`);
    console.log(`   - ${caseInserts.length} Vụ vi phạm (Đủ 4 trạng thái, có bằng chứng, chế tài, khóa quyền & khiếu nại).`);
}

main()
    .catch((e) => {
        console.error("❌ Lỗi seed Contract Service:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());