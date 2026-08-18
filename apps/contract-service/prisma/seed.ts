import { PrismaClient } from "@prisma/client-contract";

const prisma = new PrismaClient();

const now = new Date();

const identities = {
    CUSTOMER_1: "30000000-0000-0000-0000-000000000002",
    CUSTOMER_2: "30000000-0000-0000-0000-000000000003",
    CUSTOMER_3: "30000000-0000-0000-0000-000000000004",
    CUSTOMER_TRI: "30000000-0000-0000-0000-000000000008",
    PROVIDER_1: "40000000-0000-0000-0000-000000000001",
    PROVIDER_2: "40000000-0000-0000-0000-000000000002",
    PROVIDER_3: "40000000-0000-0000-0000-000000000003",
    PROVIDER_TRI: "40000000-0000-0000-0000-000000000004",
};
const servicePrice = (n: number) =>
    `62000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const room = (n: number) =>
    `6b000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const contract = (n: number) =>
    `70000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const period = (n: number) =>
    `71000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const contractService = (n: number) =>
    `72000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const fileId = (n: number) =>
    `73000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const termId = (n: number) =>
    `74000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const contractTermId = (n: number) =>
    `75000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const violationRuleId = (n: number) =>
    `76000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const violationCaseId = (n: number) =>
    `77000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const evidenceId = (n: number) =>
    `78000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const actionId = (n: number) =>
    `79000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const restrictionId = (n: number) =>
    `7a000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const appealId = (n: number) =>
    `7b000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

async function main() {
    await prisma.term.createMany({
        data: Array.from({ length: 20 }, (_, i) => ({
            id: termId(i + 1),
            content: [
                "Khách hàng thanh toán đúng hạn theo kỳ thanh toán đã thỏa thuận.",
                "Nhà cung cấp có trách nhiệm bảo đảm chất lượng dịch vụ.",
                "Hai bên có trách nhiệm cung cấp thông tin chính xác.",
                "Mọi thay đổi về giá phải được thông báo trước.",
                "Khách hàng giữ gìn tài sản thuộc phạm vi hợp đồng.",
            ][i % 5],
            status: i % 8 === 0 ? ("INACTIVE" as const) : ("ACTIVE" as const),
            createdAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.contractTemplate.createMany({
        data: Array.from({ length: 12 }, (_, i) => ({
            id: `7c000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
            providerId: [
                identities.PROVIDER_1,
                identities.PROVIDER_2,
                identities.PROVIDER_3,
                null,
            ][i % 4],
            name: `Mẫu hợp đồng dịch vụ ${i + 1}`,
            description: "Mẫu hợp đồng sử dụng cho dịch vụ nhà ở và tiện ích.",
            content: {
                tieuDe: "HỢP ĐỒNG DỊCH VỤ",
                dieuKhoan: "Các bên thực hiện đúng thỏa thuận.",
            },
            status: i % 5 === 0 ? ("DRAFT" as const) : ("ACTIVE" as const),
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.templateVariable.createMany({
        data: Array.from({ length: 25 }, (_, i) => ({
            id: `7d000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
            key:
                [
                    "ho_ten",
                    "so_hop_dong",
                    "ngay_bat_dau",
                    "ngay_ket_thuc",
                    "gia_dich_vu",
                ][i % 5] + `_${i + 1}`,
            label: [
                "Họ và tên",
                "Số hợp đồng",
                "Ngày bắt đầu",
                "Ngày kết thúc",
                "Giá dịch vụ",
            ][i % 5],
            groupName: ["Khách hàng", "Hợp đồng", "Dịch vụ"][i % 3],
        })),
        skipDuplicates: true,
    });

    await prisma.contract.createMany({
        data: Array.from({ length: 36 }, (_, i) => {
            const provider = [
                identities.PROVIDER_1,
                identities.PROVIDER_2,
                identities.PROVIDER_3,
                identities.PROVIDER_TRI,
            ][i % 4];
            const customer = [
                identities.CUSTOMER_1,
                identities.CUSTOMER_2,
                identities.CUSTOMER_3,
                identities.CUSTOMER_TRI,
            ][i % 4];
            const status = [
                "ACTIVE",
                "ACTIVE",
                "ACTIVE",
                "EXPIRED",
                "TERMINATED",
                "PENDING_SIGNATURE",
            ][i % 6] as any;
            return {
                id: contract(i + 1),
                contractNumber: `HD-2026-${String(i + 1).padStart(4, "0")}`,
                providerId: provider,
                roomId: room(i + 1),
                customerId: customer,
                startDate: new Date(
                    `2026-${String((i % 6) + 1).padStart(2, "0")}-01`,
                ),
                endDate:
                    status === "EXPIRED"
                        ? new Date("2026-06-30")
                        : status === "TERMINATED"
                          ? new Date("2026-07-15")
                          : new Date("2027-06-30"),
                status,
                requireSignature: status === "PENDING_SIGNATURE",
                signedAt: status === "PENDING_SIGNATURE" ? null : now,
                createdAt: now,
                updatedAt: now,
            };
        }),
        skipDuplicates: true,
    });

    await prisma.billingPeriod.createMany({
        data: Array.from({ length: 108 }, (_, i) => {
            const c = (i % 36) + 1;
            const month = (i % 12) + 1;
            return {
                id: period(i + 1),
                contractId: contract(c),
                periodStart: new Date(
                    `2026-${String(month).padStart(2, "0")}-01`,
                ),
                periodEnd: new Date(
                    `2026-${String(month).padStart(2, "0")}-${[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]}`,
                ),
                createdAt: now,
                updatedAt: now,
            };
        }),
        skipDuplicates: true,
    });

    await prisma.contractService.createMany({
        data: Array.from({ length: 72 }, (_, i) => ({
            id: contractService(i + 1),
            contractId: contract((i % 36) + 1),
            servicePriceId: servicePrice((i % 100) + 1),
            quantity: String((i % 3) + 1),
            createdAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.contractFile.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
            id: fileId(i + 1),
            contractId: contract((i % 36) + 1),
            pdfUrl: `https://example.com/hop-dong/${contract((i % 36) + 1)}.pdf`,
            hashContract: `băm-hop-dong-${i + 1}`,
        })),
        skipDuplicates: true,
    });

    await prisma.contractTerm.createMany({
        data: Array.from({ length: 100 }, (_, i) => ({
            id: contractTermId(i + 1),
            contractId: contract((i % 36) + 1),
            termId: termId((i % 20) + 1),
            createdAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.violationRule.createMany({
        data: Array.from({ length: 15 }, (_, i) => ({
            id: violationRuleId(i + 1),
            name: [
                "Thanh toán trễ hạn",
                "Gây hư hỏng tài sản",
                "Vi phạm quy định sử dụng",
                "Cung cấp dịch vụ không đạt chất lượng",
                "Cung cấp thông tin sai lệch",
            ][i % 5],
            description:
                "Quy tắc xử lý vi phạm trong quá trình thực hiện hợp đồng.",
            targetType: ["CUSTOMER", "PROVIDER", "BOTH"][i % 3] as any,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.violationCase.createMany({
        data: Array.from({ length: 45 }, (_, i) => ({
            id: violationCaseId(i + 1),
            violationRuleId: violationRuleId((i % 15) + 1),
            contractId: contract((i % 36) + 1),
            providerId: [
                identities.PROVIDER_1,
                identities.PROVIDER_2,
                identities.PROVIDER_3,
                identities.PROVIDER_TRI,
            ][i % 4],
            reportedBy: [
                identities.CUSTOMER_1,
                identities.CUSTOMER_2,
                identities.PROVIDER_1,
            ][i % 3],
            serviceId: `61000000-0000-0000-0000-${String((i % 60) + 1).padStart(12, "0")}`,
            status: ["REPORTED", "RESOLVED", "REJECTED", "CANCELLED"][
                i % 4
            ] as any,
            description: "Mô tả tình huống vi phạm dùng cho dữ liệu kiểm thử.",
            occurredAt: new Date(
                `2026-${String((i % 6) + 1).padStart(2, "0")}-10`,
            ),
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.violationEvidence.createMany({
        data: Array.from({ length: 60 }, (_, i) => ({
            id: evidenceId(i + 1),
            violationCaseId: violationCaseId((i % 45) + 1),
            fileUrl: `https://example.com/bang-chung/${i + 1}.jpg`,
        })),
        skipDuplicates: true,
    });

    await prisma.violationAction.createMany({
        data: Array.from({ length: 45 }, (_, i) => ({
            id: actionId(i + 1),
            violationCaseId: violationCaseId(i + 1),
            performedBy: "30000000-0000-0000-0000-000000000001",
            actionType: [
                "WARNING",
                "REQUEST_CORRECTION",
                "FINE",
                "RESTRICT",
                "NO_ACTION",
            ][i % 5] as any,
            reason: "Xử lý theo quy định của hệ thống.",
            amount: i % 5 === 2 ? String(100000 + i * 10000) : null,
            createdAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.restriction.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
            id: restrictionId(i + 1),
            violationActionId: actionId((i % 45) + 1),
            providerId: i % 2 === 0 ? identities.PROVIDER_1 : null,
            customerId: i % 2 !== 0 ? identities.CUSTOMER_1 : null,
            serviceId: `61000000-0000-0000-0000-${String((i % 60) + 1).padStart(12, "0")}`,
            scopeType: ["PLATFORM", "PROVIDER", "SERVICE"][i % 3] as any,
            reason: "Hạn chế tạm thời do vi phạm quy định.",
            startAt: new Date("2026-07-01"),
            endAt: new Date("2026-08-31"),
            createdBy: "30000000-0000-0000-0000-000000000001",
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    await prisma.violationAppeal.createMany({
        data: Array.from({ length: 25 }, (_, i) => ({
            id: appealId(i + 1),
            violationCaseId: violationCaseId((i % 45) + 1),
            appellantId: [
                identities.CUSTOMER_1,
                identities.CUSTOMER_2,
                identities.PROVIDER_1,
            ][i % 3],
            reviewedBy:
                i % 3 === 0 ? "30000000-0000-0000-0000-000000000001" : null,
            reason: "Đề nghị xem xét lại tình huống vi phạm.",
            status: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"][
                i % 4
            ] as any,
            reviewedAt: i % 3 === 0 ? now : null,
            resolutionNote:
                i % 3 === 0 ? "Đã xem xét hồ sơ và bằng chứng." : null,
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    console.log("Đã seed contract-service.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
