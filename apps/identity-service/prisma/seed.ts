import { PrismaClient } from "@prisma/client-identity";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const IDS = {
  roles: {
    ADMIN: "10000000-0000-0000-0000-000000000001",
    CUSTOMER: "10000000-0000-0000-0000-000000000002",
    PROVIDER: "10000000-0000-0000-0000-000000000003",
  },

  permissions: {
    USER_READ: "20000000-0000-0000-0000-000000000001",
    USER_MANAGE: "20000000-0000-0000-0000-000000000002",
    SERVICE_MANAGE: "20000000-0000-0000-0000-000000000003",
    CONTRACT_MANAGE: "20000000-0000-0000-0000-000000000004",
    BILLING_MANAGE: "20000000-0000-0000-0000-000000000005",
  },

  identities: {
    ADMIN: "30000000-0000-0000-0000-000000000001",
    CUSTOMER_1: "30000000-0000-0000-0000-000000000002",
    CUSTOMER_2: "30000000-0000-0000-0000-000000000003",
    PROVIDER_1: "30000000-0000-0000-0000-000000000004",
    PROVIDER_2: "30000000-0000-0000-0000-000000000005",
  },

  providers: {
    PROVIDER_1: "40000000-0000-0000-0000-000000000001",
    PROVIDER_2: "40000000-0000-0000-0000-000000000002",
  },

  verifications: {
    CUSTOMER_1: "50000000-0000-0000-0000-000000000001",
    PROVIDER_1: "50000000-0000-0000-0000-000000000002",
  },

  documents: {
    CUSTOMER_1: "60000000-0000-0000-0000-000000000001",
    PROVIDER_1: "60000000-0000-0000-0000-000000000002",
  },

  legalDocuments: {
    PROVIDER_1_LICENSE: "70000000-0000-0000-0000-000000000001",
    PROVIDER_2_LICENSE: "70000000-0000-0000-0000-000000000002",
  },
};

async function main() {
  console.log("🌱 Seeding identity service...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // =========================
  // ROLES
  // =========================

  await prisma.role.createMany({
    data: [
      {
        id: IDS.roles.ADMIN,
        name: "ADMIN",
        description: "System administrator",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: IDS.roles.CUSTOMER,
        name: "CUSTOMER",
        description: "Customer",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: IDS.roles.PROVIDER,
        name: "PROVIDER",
        description: "Service provider",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // PERMISSIONS
  // =========================

  await prisma.permission.createMany({
    data: [
      {
        id: IDS.permissions.USER_READ,
        code: "USER_READ",
        resource: "USER",
        action: "READ",
        description: "Read users",
        createdAt: new Date(),
      },
      {
        id: IDS.permissions.USER_MANAGE,
        code: "USER_MANAGE",
        resource: "USER",
        action: "MANAGE",
        description: "Manage users",
        createdAt: new Date(),
      },
      {
        id: IDS.permissions.SERVICE_MANAGE,
        code: "SERVICE_MANAGE",
        resource: "SERVICE",
        action: "MANAGE",
        description: "Manage services",
        createdAt: new Date(),
      },
      {
        id: IDS.permissions.CONTRACT_MANAGE,
        code: "CONTRACT_MANAGE",
        resource: "CONTRACT",
        action: "MANAGE",
        description: "Manage contracts",
        createdAt: new Date(),
      },
      {
        id: IDS.permissions.BILLING_MANAGE,
        code: "BILLING_MANAGE",
        resource: "BILLING",
        action: "MANAGE",
        description: "Manage billing",
        createdAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // ROLE PERMISSIONS
  // =========================

  await prisma.rolePermission.createMany({
    data: [
      {
        roleId: IDS.roles.ADMIN,
        permissionId: IDS.permissions.USER_READ,
      },
      {
        roleId: IDS.roles.ADMIN,
        permissionId: IDS.permissions.USER_MANAGE,
      },
      {
        roleId: IDS.roles.ADMIN,
        permissionId: IDS.permissions.SERVICE_MANAGE,
      },
      {
        roleId: IDS.roles.ADMIN,
        permissionId: IDS.permissions.CONTRACT_MANAGE,
      },
      {
        roleId: IDS.roles.ADMIN,
        permissionId: IDS.permissions.BILLING_MANAGE,
      },

      {
        roleId: IDS.roles.PROVIDER,
        permissionId: IDS.permissions.USER_READ,
      },
      {
        roleId: IDS.roles.PROVIDER,
        permissionId: IDS.permissions.SERVICE_MANAGE,
      },
      {
        roleId: IDS.roles.PROVIDER,
        permissionId: IDS.permissions.CONTRACT_MANAGE,
      },
      {
        roleId: IDS.roles.PROVIDER,
        permissionId: IDS.permissions.BILLING_MANAGE,
      },

      {
        roleId: IDS.roles.CUSTOMER,
        permissionId: IDS.permissions.USER_READ,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // IDENTITIES
  // =========================

  await prisma.identity.createMany({
    data: [
      {
        id: IDS.identities.ADMIN,
        email: "admin@servicehub.com",
        phone: "0900000001",
        passwordHash,
        roleId: IDS.roles.ADMIN,
        status: "ACTIVE",
        isEkycVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: IDS.identities.CUSTOMER_1,
        email: "customer1@example.com",
        phone: "0900000002",
        passwordHash,
        roleId: IDS.roles.CUSTOMER,
        status: "ACTIVE",
        isEkycVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: IDS.identities.CUSTOMER_2,
        email: "customer2@example.com",
        phone: "0900000003",
        passwordHash,
        roleId: IDS.roles.CUSTOMER,
        status: "ACTIVE",
        isEkycVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: IDS.identities.PROVIDER_1,
        email: "provider1@servicehub.com",
        phone: "0900000004",
        passwordHash,
        roleId: IDS.roles.PROVIDER,
        status: "ACTIVE",
        isEkycVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: IDS.identities.PROVIDER_2,
        email: "provider2@servicehub.com",
        phone: "0900000005",
        passwordHash,
        roleId: IDS.roles.PROVIDER,
        status: "ACTIVE",
        isEkycVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // PROVIDERS
  // =========================

  await prisma.provider.createMany({
    data: [
      {
        id: IDS.providers.PROVIDER_1,
        identityId: IDS.identities.PROVIDER_1,
        providerName: "Sunrise Property",
        companyName: "Sunrise Property Management Co., Ltd.",
        taxCode: "0312345678",
        representativeName: "Nguyen Van An",
        representativePosition: "Director",
        businessType: "COMPANY",
        providerType: "PROPERTY_MANAGER",
        status: "ACTIVE",
        phone: "0900000004",
        email: "provider1@servicehub.com",
        address: "123 Nguyen Van Linh, Ho Chi Minh City",
        description: "Professional property management service.",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: IDS.providers.PROVIDER_2,
        identityId: IDS.identities.PROVIDER_2,
        providerName: "QuickFix Services",
        companyName: "QuickFix Service Co., Ltd.",
        taxCode: "0312345679",
        representativeName: "Tran Van Binh",
        representativePosition: "Manager",
        businessType: "COMPANY",
        providerType: "EXTERNAL_SERVICE",
        status: "ACTIVE",
        phone: "0900000005",
        email: "provider2@servicehub.com",
        address: "456 Dien Bien Phu, Ho Chi Minh City",
        description: "Home maintenance and repair services.",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // EKYC
  // =========================

  await prisma.identityVerification.createMany({
    data: [
      {
        id: IDS.verifications.CUSTOMER_1,
        identityId: IDS.identities.CUSTOMER_1,
        provider: "MOCK_EKYC",
        referenceId: "EKYC-CUSTOMER-001",
        verificationLevel: "LEVEL_2",
        faceSimilarity: 0.9825,
        livenessScore: 0.9912,
        providerResponse: {
          status: "VERIFIED",
          mock: true,
        },
        verifiedAt: new Date(),
        createdAt: new Date(),
      },
      {
        id: IDS.verifications.PROVIDER_1,
        identityId: IDS.identities.PROVIDER_1,
        provider: "MOCK_EKYC",
        referenceId: "EKYC-PROVIDER-001",
        verificationLevel: "LEVEL_2",
        faceSimilarity: 0.9755,
        livenessScore: 0.9888,
        providerResponse: {
          status: "VERIFIED",
          mock: true,
        },
        verifiedAt: new Date(),
        createdAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // IDENTITY DOCUMENT
  // =========================

  await prisma.identityDocument.createMany({
    data: [
      {
        id: IDS.documents.CUSTOMER_1,
        verificationId: IDS.verifications.CUSTOMER_1,
        documentType: "CCCD",
        documentNumber: "079201001234",
        fullName: "Nguyen Thi Hoa",
        dateOfBirth: new Date("2002-05-15"),
        gender: "FEMALE",
        nationality: "Vietnam",
        issueDate: new Date("2022-06-01"),
        expiryDate: new Date("2037-06-01"),
        issuingAuthority: "C06",
        frontImageUrl: "https://example.com/ekyc/customer1-front.jpg",
        backImageUrl: "https://example.com/ekyc/customer1-back.jpg",
        selfieImageUrl: "https://example.com/ekyc/customer1-selfie.jpg",
        ocrRawData: {
          mock: true,
          documentNumber: "079201001234",
        },
        createdAt: new Date(),
      },
      {
        id: IDS.documents.PROVIDER_1,
        verificationId: IDS.verifications.PROVIDER_1,
        documentType: "CCCD",
        documentNumber: "079201005678",
        fullName: "Nguyen Van An",
        dateOfBirth: new Date("1988-03-20"),
        gender: "MALE",
        nationality: "Vietnam",
        issueDate: new Date("2021-04-01"),
        expiryDate: new Date("2036-04-01"),
        issuingAuthority: "C06",
        frontImageUrl: "https://example.com/ekyc/provider1-front.jpg",
        backImageUrl: "https://example.com/ekyc/provider1-back.jpg",
        selfieImageUrl: "https://example.com/ekyc/provider1-selfie.jpg",
        createdAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // PROVIDER LEGAL DOCUMENTS
  // =========================

  await prisma.providerLegalDocument.createMany({
    data: [
      {
        id: IDS.legalDocuments.PROVIDER_1_LICENSE,
        providerId: IDS.providers.PROVIDER_1,
        documentType: "BUSINESS_LICENSE",
        documentName: "Business Registration Certificate",
        documentNumber: "0312345678",
        fileUrl: "https://example.com/legal/provider1-license.pdf",
        issueDate: new Date("2020-01-10"),
        verificationStatus: "VERIFIED",
        verifiedBy: IDS.identities.ADMIN,
        verifiedAt: new Date(),
        note: "Verified successfully.",
        createdAt: new Date(),
      },
      {
        id: IDS.legalDocuments.PROVIDER_2_LICENSE,
        providerId: IDS.providers.PROVIDER_2,
        documentType: "BUSINESS_LICENSE",
        documentName: "Business Registration Certificate",
        documentNumber: "0312345679",
        fileUrl: "https://example.com/legal/provider2-license.pdf",
        issueDate: new Date("2021-03-15"),
        verificationStatus: "VERIFIED",
        verifiedBy: IDS.identities.ADMIN,
        verifiedAt: new Date(),
        createdAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Identity seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
