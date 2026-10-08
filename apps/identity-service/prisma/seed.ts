import { PrismaClient } from "@prisma/client-identity";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const roleIds = {
    ADMIN: "31000000-0000-4000-8000-000000000001",
    CUSTOMER: "31000000-0000-4000-8000-000000000002",
    PROVIDER: "31000000-0000-4000-8000-000000000003",
};

const permissionId = (n: number) => `32000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const providerId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const verificationId = (n: number) => `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const identityDocumentId = (n: number) => `51000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const providerLegalDocumentId = (n: number) => `52000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const now = new Date();

// Data arrays for generation
const firstNames = ["Anh", "Bình", "Cường", "Dung", "Dương", "Hải", "Hào", "Hoa", "Hoàng", "Hùng", "Hương", "Linh", "Lan", "Mai", "Minh", "Nga", "Ngọc", "Nhi", "Phát", "Phương", "Quân", "Quang", "Thảo", "Thắng", "Thành", "Thu", "Trang", "Trí", "Tuấn", "Tùng"];
const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const middleNamesM = ["Văn", "Hữu", "Đức", "Công", "Quang", "Minh", "Thế", "Đình"];
const middleNamesF = ["Thị", "Ngọc", "Thanh", "Bích", "Thu", "Phương", "Hồng"];

function randomName(isMale: boolean) {
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const middle = isMale ? middleNamesM[Math.floor(Math.random() * middleNamesM.length)] : middleNamesF[Math.floor(Math.random() * middleNamesF.length)];
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    return `${last} ${middle} ${first}`;
}

const providerData = [
    { name: "Dịch vụ giặt ủi Sakura", company: "Công ty TNHH Giặt ủi Sakura", desc: "Giặt sấy lấy liền, giặt ủi công nghiệp", type: "EXTERNAL_SERVICE", address: "88 Nơ Trang Long, Phường 14, Bình Thạnh, TP.HCM" },
    { name: "Ký túc xá Cỏ May", company: "Công ty TNHH MTV Cỏ May", desc: "Ký túc xá cao cấp dành cho sinh viên", type: "PROPERTY_MANAGER", address: "Khu đô thị Đại học Quốc gia, TP. Thủ Đức, TP.HCM" },
    { name: "Căn hộ dịch vụ CityHouse", company: "Công ty CP Dịch vụ CityHouse", desc: "Chuỗi căn hộ dịch vụ cao cấp", type: "PROPERTY_MANAGER", address: "17 Phạm Ngọc Thạch, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Vệ sinh Hoàn Mỹ", company: "Công ty TNHH Vệ Sinh Hoàn Mỹ", desc: "Dịch vụ vệ sinh công nghiệp và dân dụng", type: "EXTERNAL_SERVICE", address: "25 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "Điện nước Minh Trí", company: "Hộ kinh doanh Minh Trí", desc: "Thi công và sửa chữa điện nước tại nhà", type: "EXTERNAL_SERVICE", address: "142 Âu Cơ, Phường 9, Tân Bình, TP.HCM" },
    { name: "Suất ăn công nghiệp Tâm Phát", company: "Công ty CP Suất ăn Tâm Phát", desc: "Cung cấp suất ăn văn phòng, công nghiệp", type: "EXTERNAL_SERVICE", address: "Lô B2, KCN Tân Bình, Tân Phú, TP.HCM" },
    { name: "Nhà trọ Vinhomes Central Park", company: "Công ty CP BĐS Vinhomes", desc: "Quản lý và cho thuê căn hộ Vinhomes Central Park", type: "PROPERTY_MANAGER", address: "720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM" },
    { name: "Bảo vệ Hoàng Long", company: "Công ty TNHH Dịch vụ Bảo vệ Hoàng Long", desc: "Dịch vụ bảo vệ chuyên nghiệp 24/7", type: "EXTERNAL_SERVICE", address: "155 Điện Biên Phủ, Phường 15, Bình Thạnh, TP.HCM" },
    { name: "Nội thất Xinh", company: "Công ty CP Kiến trúc và Nội thất Xinh", desc: "Thi công, lắp đặt và sửa chữa nội thất", type: "EXTERNAL_SERVICE", address: "200 Ba Tháng Hai, Phường 12, Quận 10, TP.HCM" },
    { name: "Điện lạnh Á Châu", company: "Công ty TNHH Dịch vụ Điện Lạnh Á Châu", desc: "Lắp đặt, vệ sinh, sửa chữa máy lạnh", type: "EXTERNAL_SERVICE", address: "450 Nguyễn Thị Minh Khai, Quận 3, TP.HCM" },
    { name: "Chuyển nhà Thành Hưng", company: "Công ty CP Tập đoàn Thành Hưng", desc: "Dịch vụ chuyển nhà trọn gói", type: "EXTERNAL_SERVICE", address: "1A Đường 22, Phường Linh Đông, TP. Thủ Đức, TP.HCM" },
    { name: "Nhà ở xã hội EHome", company: "Công ty CP Đầu tư Nam Long", desc: "Chuỗi nhà ở giá rẻ EHome", type: "PROPERTY_MANAGER", address: "KDC Nam Long, Phường Phước Long B, TP. Thủ Đức, TP.HCM" },
    { name: "Masteri Property", company: "Công ty CP Masterise Homes", desc: "Quản lý căn hộ Masteri Thảo Điền, Masteri An Phú", type: "PROPERTY_MANAGER", address: "159 Xa Lộ Hà Nội, Thảo Điền, TP. Thủ Đức, TP.HCM" },
    { name: "Dọn dẹp JupViec", company: "Công ty CP JupViec.vn", desc: "Dịch vụ giúp việc theo giờ", type: "EXTERNAL_SERVICE", address: "Tòa nhà 27B Nguyễn Đình Chiểu, Đa Kao, Quận 1, TP.HCM" },
    { name: "Dịch vụ diệt côn trùng Rentokil", company: "Công ty TNHH Rentokil Initial Việt Nam", desc: "Dịch vụ kiểm soát côn trùng dịch hại", type: "EXTERNAL_SERVICE", address: "Lầu 3, Tòa nhà Hà Đô, Tân Bình, TP.HCM" },
    { name: "Hệ thống chung cư Eco Green", company: "Công ty CP Đầu tư Xây dựng Xuân Mai", desc: "Quản lý khu chung cư Eco Green Sài Gòn", type: "PROPERTY_MANAGER", address: "Nguyễn Văn Linh, Tân Thuận Tây, Quận 7, TP.HCM" },
    { name: "Sửa khóa nhanh 24/7", company: "Hộ kinh doanh Sửa khóa 24h", desc: "Mở khóa, làm chìa, thay ổ khóa các loại", type: "EXTERNAL_SERVICE", address: "230 Quang Trung, Phường 10, Gò Vấp, TP.HCM" },
    { name: "Camera quan sát Đạt Phát", company: "Công ty TNHH Đạt Phát Camera", desc: "Lắp đặt và bảo trì camera an ninh", type: "EXTERNAL_SERVICE", address: "123 Lũy Bán Bích, Tân Thới Hòa, Tân Phú, TP.HCM" },
    { name: "Internet Viettel Post", company: "Tổng Công ty Viễn thông Viettel", desc: "Lắp đặt internet cáp quang sinh viên", type: "EXTERNAL_SERVICE", address: "285 Cách Mạng Tháng Tám, Quận 10, TP.HCM" },
    { name: "Giao nước uống Aqua", company: "Đại lý Nước suối AquaWater", desc: "Giao bình nước 20L tận phòng", type: "EXTERNAL_SERVICE", address: "55 Lạc Long Quân, Phường 3, Quận 11, TP.HCM" }
];

async function main() {
    const passwordHash = await bcrypt.hash("123456", 10);

    // 1. ROLES
    await prisma.role.createMany({
        data: [
            { id: roleIds.ADMIN, name: "QUẢN TRỊ VIÊN", description: "Tài khoản quản trị hệ thống", createdAt: now, updatedAt: now },
            { id: roleIds.CUSTOMER, name: "KHÁCH HÀNG", description: "Người sử dụng dịch vụ", createdAt: now, updatedAt: now },
            { id: roleIds.PROVIDER, name: "NHÀ CUNG CẤP", description: "Đơn vị cung cấp dịch vụ", createdAt: now, updatedAt: now },
        ],
        skipDuplicates: true,
    });

    // 2. PERMISSIONS
    const permissions = [
        ["identity.read", "identity", "read", "Xem thông tin danh tính"],
        ["identity.manage", "identity", "manage", "Quản lý thông tin danh tính"],
        ["provider.read", "provider", "read", "Xem hồ sơ nhà cung cấp"],
        ["provider.manage", "provider", "manage", "Quản lý hồ sơ nhà cung cấp"],
        ["catalog.read", "catalog", "read", "Xem danh mục và dịch vụ"],
        ["catalog.manage", "catalog", "manage", "Quản lý danh mục và dịch vụ"],
        ["contract.read", "contract", "read", "Xem hợp đồng"],
        ["contract.manage", "contract", "manage", "Tạo và quản lý hợp đồng"],
        ["billing.read", "billing", "read", "Xem hóa đơn"],
        ["billing.manage", "billing", "manage", "Quản lý hóa đơn và thanh toán"],
        ["notification.read", "notification", "read", "Xem thông báo"],
        ["notification.manage", "notification", "manage", "Gửi và quản lý thông báo"],
        ["audit.read", "audit", "read", "Xem nhật ký kiểm toán"],
        ["system.manage", "system", "manage", "Quản trị hệ thống"],
    ] as const;

    await prisma.permission.createMany({
        data: permissions.map(([code, resource, action, description], index) => ({
            id: permissionId(index + 1), code, resource, action, description, createdAt: now,
        })),
        skipDuplicates: true,
    });

    const allPermissionIds = permissions.map((_, index) => permissionId(index + 1));
    const providerPermissionIds = [3, 4, 5, 6, 7, 8, 9, 10, 11].map(permissionId);
    const customerPermissionIds = [1, 3, 5, 7, 9, 11].map(permissionId);
    
    await prisma.rolePermission.createMany({
        data: [
            ...allPermissionIds.map((permissionId) => ({ roleId: roleIds.ADMIN, permissionId })),
            ...providerPermissionIds.map((permissionId) => ({ roleId: roleIds.PROVIDER, permissionId })),
            ...customerPermissionIds.map((permissionId) => ({ roleId: roleIds.CUSTOMER, permissionId })),
        ],
        skipDuplicates: true,
    });

    // 3. IDENTITIES
    // Admin (1)
    const adminIdentity = { id: userId(1), email: "admin@servicehub.vn", phone: "0900000001", passwordHash, roleId: roleIds.ADMIN, status: "ACTIVE" as const, isEkycVerified: true, createdAt: now, updatedAt: now };
    
    // Customers (101 -> 150) - 50 customers
    const customerIdentities = Array.from({ length: 50 }, (_, i) => ({
        id: userId(101 + i),
        email: `khachhang${i + 1}@servicehub.vn`,
        phone: `090${String(1000000 + i).slice(1)}`,
        passwordHash,
        roleId: roleIds.CUSTOMER,
        status: "ACTIVE" as const,
        isEkycVerified: true,
        createdAt: now,
        updatedAt: now
    }));

    // Providers (201 -> 220) - 20 providers
    const providerIdentities = Array.from({ length: 20 }, (_, i) => ({
        id: userId(201 + i),
        email: `nhacungcap${i + 1}@servicehub.vn`,
        phone: `091${String(1000000 + i).slice(1)}`,
        passwordHash,
        roleId: roleIds.PROVIDER,
        // Lifecycle PENDING/SUSPENDED belongs to Provider.status; Identity only
        // supports ACTIVE/INACTIVE in the identity-service schema.
        status: (i === 19 ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE",
        isEkycVerified: i !== 18,
        createdAt: now,
        updatedAt: now
    }));

    await prisma.identity.createMany({
        data: [adminIdentity, ...customerIdentities, ...providerIdentities],
        skipDuplicates: true,
    });

    // 4. PROVIDERS (Entities)
    const providers = providerData.map((data, i) => {
        const isCompany = data.company.includes("Công ty");
        return {
            id: providerId(i + 1),
            identityId: userId(201 + i),
            providerName: data.name,
            companyName: data.company,
            description: data.desc,
            phone: `091${String(1000000 + i).slice(1)}`,
            email: `contact@${data.name.toLowerCase().replace(/ /g, '')}.vn`,
            address: data.address,
            representativeName: randomName(true),
            representativePosition: isCompany ? "Giám đốc" : "Chủ hộ kinh doanh",
            businessType: isCompany ? "COMPANY" as const : "INDIVIDUAL" as const,
            providerType: data.type as "PROPERTY_MANAGER" | "EXTERNAL_SERVICE",
            status: (i === 18 ? "PENDING" : (i === 19 ? "SUSPENDED" : "ACTIVE")) as "ACTIVE" | "PENDING" | "SUSPENDED",
            createdAt: now,
            updatedAt: now
        }
    });

    await prisma.provider.createMany({
        data: providers,
        skipDuplicates: true,
    });

    // 5. IDENTITY VERIFICATIONS & DOCUMENTS (Customers 101-150 + Providers 201-220)
    const verifications = [];
    const idDocs = [];
    
    // For customers
    for (let i = 0; i < 50; i++) {
        const isMale = i % 2 === 0;
        const name = randomName(isMale);
        verifications.push({
            id: verificationId(101 + i),
            identityId: userId(101 + i),
            provider: "Hệ thống xác minh danh tính quốc gia",
            referenceId: `REF-CUST-${101 + i}`,
            verificationLevel: "NÂNG CAO",
            faceSimilarity: "0.9850",
            livenessScore: "0.9900",
            failureReason: null,
            verifiedAt: now,
            expiredAt: new Date("2032-12-31"),
            createdAt: now,
        });

        idDocs.push({
            id: identityDocumentId(101 + i),
            verificationId: verificationId(101 + i),
            documentType: "Căn cước công dân gắn chíp",
            documentNumber: `079${isMale ? '0' : '1'}${String(90000000 + i)}`,
            fullName: name,
            dateOfBirth: new Date(`19${70 + (i % 30)}-0${(i % 9) + 1}-1${i % 8}`),
            gender: isMale ? "Nam" : "Nữ",
            nationality: "Việt Nam",
            issueDate: new Date("2021-10-10"),
            expiryDate: new Date("2035-10-10"),
            issuingAuthority: "Cục Cảnh sát quản lý hành chính về trật tự xã hội",
            frontImageUrl: `https://example.com/cccd/cust-${i}-front.jpg`,
            backImageUrl: `https://example.com/cccd/cust-${i}-back.jpg`,
            selfieImageUrl: `https://example.com/cccd/cust-${i}-selfie.jpg`,
            createdAt: now,
        });
    }

    // For providers (except pending)
    for (let i = 0; i < 20; i++) {
        if (i === 18) continue; // Skip pending provider
        const name = providers[i].representativeName;
        verifications.push({
            id: verificationId(201 + i),
            identityId: userId(201 + i),
            provider: "Hệ thống xác minh danh tính doanh nghiệp",
            referenceId: `REF-PROV-${201 + i}`,
            verificationLevel: "NÂNG CAO",
            faceSimilarity: "0.9920",
            livenessScore: "0.9850",
            failureReason: null,
            verifiedAt: now,
            expiredAt: new Date("2032-12-31"),
            createdAt: now,
        });

        idDocs.push({
            id: identityDocumentId(201 + i),
            verificationId: verificationId(201 + i),
            documentType: "Căn cước công dân gắn chíp",
            documentNumber: `0010${String(90000000 + i)}`,
            fullName: name,
            dateOfBirth: new Date(`198${i % 10}-05-15`),
            gender: "Nam",
            nationality: "Việt Nam",
            issueDate: new Date("2022-01-20"),
            expiryDate: new Date("2037-01-20"),
            issuingAuthority: "Cục Cảnh sát quản lý hành chính về trật tự xã hội",
            frontImageUrl: `https://example.com/cccd/prov-${i}-front.jpg`,
            backImageUrl: `https://example.com/cccd/prov-${i}-back.jpg`,
            selfieImageUrl: `https://example.com/cccd/prov-${i}-selfie.jpg`,
            createdAt: now,
        });
    }

    await prisma.identityVerification.createMany({ data: verifications, skipDuplicates: true });
    await prisma.identityDocument.createMany({ data: idDocs, skipDuplicates: true });

    // 6. PROVIDER LEGAL DOCUMENTS
    const legalDocs = [];
    for (let i = 0; i < 20; i++) {
        const provId = providerId(i + 1);
        const status = i === 18 ? "PENDING" : "VERIFIED";
        const verifiedAtDate = i === 18 ? null : now;

        legalDocs.push({
            id: providerLegalDocumentId(i * 2 + 1),
            providerId: provId,
            documentType: "BUSINESS_LICENSE",
            documentName: "Giấy chứng nhận đăng ký doanh nghiệp",
            documentNumber: `031${String(5000000 + i)}`,
            fileUrl: `https://example.com/legal/${provId}-gpkd.pdf`,
            issueDate: new Date("2020-01-01"),
            expiryDate: null,
            verificationStatus: status,
            verifiedAt: verifiedAtDate,
            note: null,
            createdAt: now,
        });

        legalDocs.push({
            id: providerLegalDocumentId(i * 2 + 2),
            providerId: provId,
            documentType: "TAX_CERTIFICATE",
            documentName: "Giấy chứng nhận đăng ký thuế",
            documentNumber: `031${String(5000000 + i)}`,
            fileUrl: `https://example.com/legal/${provId}-thue.pdf`,
            issueDate: new Date("2020-02-01"),
            expiryDate: null,
            verificationStatus: status,
            verifiedAt: verifiedAtDate,
            note: null,
            createdAt: now,
        });
    }

    await prisma.providerLegalDocument.createMany({ data: legalDocs, skipDuplicates: true });

    console.log(`Đã seed identity-service: 1 admin, 50 customers, 20 providers, ${verifications.length} verifications.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
