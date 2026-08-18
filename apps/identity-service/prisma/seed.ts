import { PrismaClient } from "@prisma/client-identity";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const IDS = {
    identities: {
        ADMIN: "30000000-0000-0000-0000-000000000001",
        CUSTOMER_1: "30000000-0000-0000-0000-000000000002",
        CUSTOMER_2: "30000000-0000-0000-0000-000000000003",
        CUSTOMER_3: "30000000-0000-0000-0000-000000000004",
        PROVIDER_1: "30000000-0000-0000-0000-000000000005",
        PROVIDER_2: "30000000-0000-0000-0000-000000000006",
        PROVIDER_3: "30000000-0000-0000-0000-000000000007",
        CUSTOMER_TRI: "30000000-0000-0000-0000-000000000008",
        PROVIDER_TRI: "30000000-0000-0000-0000-000000000009",
        PROVIDER_PENDING: "30000000-0000-0000-0000-000000000010",
        PROVIDER_REJECTED: "30000000-0000-0000-0000-000000000011",
        PROVIDER_SUSPENDED: "30000000-0000-0000-0000-000000000012",
        PROVIDER_EXPIRED: "30000000-0000-0000-0000-000000000013",
        PROVIDER_NO_IMAGES: "30000000-0000-0000-0000-000000000014",
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
    verifications: {
        CUSTOMER_1: "50000000-0000-0000-0000-000000000001",
        PROVIDER_1: "50000000-0000-0000-0000-000000000002",
        PROVIDER_2: "50000000-0000-0000-0000-000000000003",
        PROVIDER_TRI: "50000000-0000-0000-0000-000000000004",
        PROVIDER_REJECTED: "50000000-0000-0000-0000-000000000005",
    },
} as const;

const roleIds = {
    ADMIN: "31000000-0000-0000-0000-000000000001",
    CUSTOMER: "31000000-0000-0000-0000-000000000002",
    PROVIDER: "31000000-0000-0000-0000-000000000003",
};

const now = new Date();

async function main() {
    const passwordHash = await bcrypt.hash("123456", 10);
    
    await prisma.role.createMany({
        data: [
            {
                id: roleIds.ADMIN,
                name: "QUẢN TRỊ VIÊN",
                description: "Tài khoản quản trị hệ thống",
                createdAt: now,
                updatedAt: now,
            },
            {
                id: roleIds.CUSTOMER,
                name: "KHÁCH HÀNG",
                description: "Người sử dụng dịch vụ",
                createdAt: now,
                updatedAt: now,
            },
            {
                id: roleIds.PROVIDER,
                name: "NHÀ CUNG CẤP",
                description: "Đơn vị cung cấp dịch vụ",
                createdAt: now,
                updatedAt: now,
            },
        ],
        skipDuplicates: true,
    });

    const accounts = [
        [
            IDS.identities.ADMIN,
            "admin@servicehub.vn",
            "0900000001",
            roleIds.ADMIN,
            "ACTIVE",
        ],
        [
            IDS.identities.CUSTOMER_1,
            "khachhang1@servicehub.vn",
            "0900000002",
            roleIds.CUSTOMER,
            "ACTIVE",
        ],
        [
            IDS.identities.CUSTOMER_2,
            "khachhang2@servicehub.vn",
            "0900000003",
            roleIds.CUSTOMER,
            "ACTIVE",
        ],
        [
            IDS.identities.CUSTOMER_3,
            "khachhang3@servicehub.vn",
            "0900000004",
            roleIds.CUSTOMER,
            "ACTIVE",
        ],
        [
            IDS.identities.PROVIDER_1,
            "nhacungcap1@servicehub.vn",
            "0900000005",
            roleIds.PROVIDER,
            "ACTIVE",
        ],
        [
            IDS.identities.PROVIDER_2,
            "nhacungcap2@servicehub.vn",
            "0900000006",
            roleIds.PROVIDER,
            "ACTIVE",
        ],
        [
            IDS.identities.PROVIDER_3,
            "nhacungcap3@servicehub.vn",
            "0900000007",
            roleIds.PROVIDER,
            "ACTIVE",
        ],
        [
            IDS.identities.CUSTOMER_TRI,
            "trikhachhang@servicehub.vn",
            "0900000008",
            roleIds.CUSTOMER,
            "ACTIVE",
        ],
        [
            IDS.identities.PROVIDER_TRI,
            "trinhacungcap@servicehub.vn",
            "0900000009",
            roleIds.PROVIDER,
            "ACTIVE",
        ],
        [
            IDS.identities.PROVIDER_PENDING,
            "nhacungcapcho@servicehub.vn",
            "0900000010",
            roleIds.PROVIDER,
            "ACTIVE",
        ],
        [
            IDS.identities.PROVIDER_REJECTED,
            "nhacungcapbiuchoi@servicehub.vn",
            "0900000011",
            roleIds.PROVIDER,
            "ACTIVE",
        ],
        [
            IDS.identities.PROVIDER_SUSPENDED,
            "nhacungcapbitamdung@servicehub.vn",
            "0900000012",
            roleIds.PROVIDER,
            "ACTIVE",
        ],
        [
            IDS.identities.PROVIDER_EXPIRED,
            "nhacungcaphethan@servicehub.vn",
            "0900000013",
            roleIds.PROVIDER,
            "ACTIVE",
        ],
        [
            IDS.identities.PROVIDER_NO_IMAGES,
            "nhacungcapkhonganh@servicehub.vn",
            "0900000014",
            roleIds.PROVIDER,
            "ACTIVE",
        ],
    ] as const;

    await prisma.identity.createMany({
        data: accounts.map(([id, email, phone, roleId, status]) => ({
            id,
            email,
            phone,
            passwordHash,
            roleId,
            status: status as "ACTIVE",
            isEkycVerified:
                id !== IDS.identities.PROVIDER_PENDING &&
                id !== IDS.identities.PROVIDER_REJECTED,
            createdAt: now,
            updatedAt: now,
        })),
        skipDuplicates: true,
    });

    const providers = [
        [
            "PROVIDER_1",
            "Nhà trọ An Bình",
            "Công ty TNHH An Bình",
            "Quản lý nhà trọ, căn hộ và dịch vụ tiện ích",
            "0901000001",
            "contact@anbinh.vn",
            "ACTIVE",
            "PROPERTY_MANAGER",
        ],
        [
            "PROVIDER_2",
            "Dịch vụ Gia Hân",
            "Hộ kinh doanh Gia Hân",
            "Dịch vụ vệ sinh và chăm sóc nhà ở",
            "0901000002",
            "lienhe@giahan.vn",
            "ACTIVE",
            "EXTERNAL_SERVICE",
        ],
        [
            "PROVIDER_3",
            "Bếp Nhà Việt",
            "Công ty TNHH Bếp Nhà Việt",
            "Cung cấp suất ăn gia đình và văn phòng",
            "0901000003",
            "hello@bepnhaviet.vn",
            "ACTIVE",
            "EXTERNAL_SERVICE",
        ],
        [
            "PROVIDER_TRI",
            "Trí Sửa Chữa",
            "Hộ kinh doanh Trí Sửa Chữa",
            "Sửa chữa điện nước và thiết bị gia dụng",
            "0901000004",
            "tri@suachua.vn",
            "ACTIVE",
            "EXTERNAL_SERVICE",
        ],
        [
            "PROVIDER_PENDING",
            "Dịch vụ Minh Tâm",
            "Hộ kinh doanh Minh Tâm",
            "Đơn vị đang chờ xét duyệt",
            "0901000005",
            "minhtam@servicehub.vn",
            "PENDING",
            "EXTERNAL_SERVICE",
        ],
        [
            "PROVIDER_REJECTED",
            "Dịch vụ Hoàng Long",
            "Hộ kinh doanh Hoàng Long",
            "Hồ sơ đăng ký chưa đạt yêu cầu",
            "0901000006",
            "hoanglong@servicehub.vn",
            "PENDING",
            "EXTERNAL_SERVICE",
        ],
        [
            "PROVIDER_SUSPENDED",
            "Nhà ở Phúc An",
            "Công ty TNHH Phúc An",
            "Nhà cung cấp đang bị tạm ngưng",
            "0901000007",
            "phucan@servicehub.vn",
            "SUSPENDED",
            "PROPERTY_MANAGER",
        ],
        [
            "PROVIDER_EXPIRED",
            "Dịch vụ Việt Thành",
            "Công ty TNHH Việt Thành",
            "Nhà cung cấp có hồ sơ hết hạn",
            "0901000008",
            "vietthanh@servicehub.vn",
            "ACTIVE",
            "EXTERNAL_SERVICE",
        ],
        [
            "PROVIDER_NO_IMAGES",
            "Dịch vụ Thanh Bình",
            "Hộ kinh doanh Thanh Bình",
            "Nhà cung cấp dùng để kiểm thử không có ảnh",
            "0901000009",
            "thanhbinh@servicehub.vn",
            "ACTIVE",
            "EXTERNAL_SERVICE",
        ],
    ] as const;

    await prisma.provider.createMany({
        data: providers.map(
            ([
                key,
                name,
                companyName,
                description,
                phone,
                email,
                status,
                type,
            ]) => ({
                id: IDS.providers[key as keyof typeof IDS.providers],
                identityId: IDS.identities[key as keyof typeof IDS.identities],
                providerName: name,
                companyName,
                description,
                phone,
                email,
                address: "Thành phố Hồ Chí Minh, Việt Nam",
                representativeName:
                    key === "PROVIDER_TRI"
                        ? "Nguyễn Văn Trí"
                        : "Nguyễn Văn " + name.split(" ").at(-1),
                representativePosition: "Chủ hộ kinh doanh",
                businessType: "COMPANY" as const,
                providerType: type as "PROPERTY_MANAGER" | "EXTERNAL_SERVICE",
                status: status as "PENDING" | "ACTIVE" | "SUSPENDED",
                createdAt: now,
                updatedAt: now,
            }),
        ),
        skipDuplicates: true,
    });

    const verifications = [
        [
            IDS.verifications.CUSTOMER_1,
            IDS.identities.CUSTOMER_1,
            "Căn cước công dân",
            "Nguyễn Thị Mai",
            "VERIFIED",
        ],
        [
            IDS.verifications.PROVIDER_1,
            IDS.identities.PROVIDER_1,
            "Giấy phép kinh doanh",
            "Nguyễn Văn An",
            "VERIFIED",
        ],
        [
            IDS.verifications.PROVIDER_2,
            IDS.identities.PROVIDER_2,
            "Giấy phép kinh doanh",
            "Trần Thị Hân",
            "VERIFIED",
        ],
        [
            IDS.verifications.PROVIDER_TRI,
            IDS.identities.PROVIDER_TRI,
            "Giấy phép kinh doanh",
            "Nguyễn Văn Trí",
            "VERIFIED",
        ],
        [
            IDS.verifications.PROVIDER_REJECTED,
            IDS.identities.PROVIDER_REJECTED,
            "Giấy phép kinh doanh",
            "Hoàng Văn Long",
            "REJECTED",
        ],
    ] as const;

    await prisma.identityVerification.createMany({
        data: verifications.map(
            ([id, identityId, documentType, fullName, status]) => ({
                id,
                identityId,
                provider: "Hệ thống xác minh danh tính",
                referenceId: id,
                verificationLevel: "CƠ BẢN",
                faceSimilarity: status === "VERIFIED" ? "0.9800" : "0.4200",
                livenessScore: status === "VERIFIED" ? "0.9700" : "0.3000",
                failureReason:
                    status === "REJECTED"
                        ? "Thông tin hồ sơ không khớp."
                        : null,
                verifiedAt: status === "VERIFIED" ? now : null,
                expiredAt:
                    status === "VERIFIED" ? new Date("2027-12-31") : null,
                createdAt: now,
            }),
        ),
        skipDuplicates: true,
    });

    const documents = verifications.map(
        ([id, identityId, documentType, fullName, status], i) => ({
            id: randomUUID(),
            verificationId: id,
            documentType,
            documentNumber: `0792${String(i + 1).padStart(8, "0")}`,
            fullName,
            dateOfBirth: new Date(`199${i}-0${i + 1}-0${i + 2}`),
            gender: i % 2 ? "Nữ" : "Nam",
            nationality: "Việt Nam",
            issueDate: new Date("2022-01-01"),
            expiryDate: new Date("2032-01-01"),
            issuingAuthority:
                "Cục Cảnh sát quản lý hành chính về trật tự xã hội",
            frontImageUrl: `https://example.com/cccd/${id}-mat-truoc.jpg`,
            backImageUrl: `https://example.com/cccd/${id}-mat-sau.jpg`,
            selfieImageUrl: `https://example.com/cccd/${id}-chan-dung.jpg`,
            createdAt: now,
        }),
    );
    await prisma.identityDocument.createMany({
        data: documents,
        skipDuplicates: true,
    });

    const legalTypes = [
        "BUSINESS_LICENSE",
        "TAX_CERTIFICATE",
        "OTHER",
    ] as const;
    const providerRows = Object.entries(IDS.providers);
    await prisma.providerLegalDocument.createMany({
        data: providerRows.flatMap(([key, providerId], i) => [
            {
                id: randomUUID(),
                providerId,
                documentType: "BUSINESS_LICENSE",
                documentName: "Giấy chứng nhận đăng ký kinh doanh",
                documentNumber: `GPKD-${1000 + i}`,
                fileUrl: `https://example.com/ho-so/${providerId}/giay-phep.pdf`,
                issueDate: new Date("2024-01-01"),
                expiryDate:
                    i === 7 ? new Date("2025-12-31") : new Date("2030-12-31"),
                verificationStatus:
                    key === "PROVIDER_REJECTED"
                        ? "REJECTED"
                        : key === "PROVIDER_PENDING"
                          ? "PENDING"
                          : "VERIFIED",
                verifiedAt: key === "PROVIDER_PENDING" ? null : now,
                note:
                    key === "PROVIDER_REJECTED"
                        ? "Hồ sơ chưa đáp ứng yêu cầu."
                        : null,
                createdAt: now,
            },
            {
                id: randomUUID(),
                providerId,
                documentType: legalTypes[1],
                documentName: "Giấy chứng nhận đăng ký thuế",
                documentNumber: `MST-${2000 + i}`,
                fileUrl: `https://example.com/ho-so/${providerId}/thue.pdf`,
                issueDate: new Date("2024-02-01"),
                expiryDate: null,
                verificationStatus:
                    key === "PROVIDER_REJECTED" ? "REJECTED" : "VERIFIED",
                verifiedAt: key === "PROVIDER_REJECTED" ? null : now,
                note: null,
                createdAt: now,
            },
        ]),
        skipDuplicates: true,
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
