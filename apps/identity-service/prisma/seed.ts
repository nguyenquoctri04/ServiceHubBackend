import { PrismaClient } from '@prisma/client-identity';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const IDS = {
  roles: {
    ADMIN: '10000000-0000-0000-0000-000000000001',
    CUSTOMER: '10000000-0000-0000-0000-000000000002',
    PROVIDER: '10000000-0000-0000-0000-000000000003',
  },

  permissions: {
    USER_READ: '20000000-0000-0000-0000-000000000001',
    USER_MANAGE: '20000000-0000-0000-0000-000000000002',
    SERVICE_READ: '20000000-0000-0000-0000-000000000003',
    SERVICE_MANAGE: '20000000-0000-0000-0000-000000000004',
    CONTRACT_READ: '20000000-0000-0000-0000-000000000005',
    CONTRACT_MANAGE: '20000000-0000-0000-0000-000000000006',
    BILLING_READ: '20000000-0000-0000-0000-000000000007',
    BILLING_MANAGE: '20000000-0000-0000-0000-000000000008',
    NOTIFICATION_MANAGE: '20000000-0000-0000-0000-000000000009',
  },

  identities: {
    ADMIN: '30000000-0000-0000-0000-000000000001',
    CUSTOMER_1: '30000000-0000-0000-0000-000000000002',
    CUSTOMER_2: '30000000-0000-0000-0000-000000000003',
    CUSTOMER_3: '30000000-0000-0000-0000-000000000004',
    CUSTOMER_TRI: '30000000-0000-0000-0000-000000000008',
    PROVIDER_1: '30000000-0000-0000-0000-000000000005',
    PROVIDER_2: '30000000-0000-0000-0000-000000000006',
    PROVIDER_3: '30000000-0000-0000-0000-000000000007',
    PROVIDER_TRI: '30000000-0000-0000-0000-000000000009',
    // Edge cases identities
    PROVIDER_PENDING: '30000000-0000-0000-0000-000000000010',
    PROVIDER_REJECTED: '30000000-0000-0000-0000-000000000011',
    PROVIDER_SUSPENDED: '30000000-0000-0000-0000-000000000012',
    PROVIDER_EXPIRED: '30000000-0000-0000-0000-000000000013',
    PROVIDER_NO_IMAGES: '30000000-0000-0000-0000-000000000014',
  },

  providers: {
    PROVIDER_1: '40000000-0000-0000-0000-000000000001',
    PROVIDER_2: '40000000-0000-0000-0000-000000000002',
    PROVIDER_3: '40000000-0000-0000-0000-000000000003',
    PROVIDER_TRI: '40000000-0000-0000-0000-000000000004',
    // Edge cases providers
    PROVIDER_PENDING: '40000000-0000-0000-0000-000000000005',
    PROVIDER_REJECTED: '40000000-0000-0000-0000-000000000006',
    PROVIDER_SUSPENDED: '40000000-0000-0000-0000-000000000007',
    PROVIDER_EXPIRED: '40000000-0000-0000-0000-000000000008',
    PROVIDER_NO_IMAGES: '40000000-0000-0000-0000-000000000009',
  },

  verifications: {
    CUSTOMER_1: '50000000-0000-0000-0000-000000000001',
    PROVIDER_1: '50000000-0000-0000-0000-000000000002',
    PROVIDER_2: '50000000-0000-0000-0000-000000000003',
    PROVIDER_TRI: '50000000-0000-0000-0000-000000000004',
    // Edge cases verifications
    PROVIDER_REJECTED: '50000000-0000-0000-0000-000000000005',
  },
};

async function main() {
  console.log('🌱 Seeding identity service...');
  const now = new Date();
  const passwordHash = await bcrypt.hash('123', 10);

  // ROLES
  const roles = [
    { id: IDS.roles.ADMIN, name: 'ADMIN', description: 'System administrator' },
    { id: IDS.roles.CUSTOMER, name: 'CUSTOMER', description: 'Customer using ServiceHub' },
    { id: IDS.roles.PROVIDER, name: 'PROVIDER', description: 'Service provider' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, updatedAt: now },
      create: { ...role, createdAt: now, updatedAt: now },
    });
  }

  // PERMISSIONS
  const permissions = [
    { id: IDS.permissions.USER_READ, code: 'USER_READ', resource: 'USER', action: 'READ', description: 'View users' },
    { id: IDS.permissions.USER_MANAGE, code: 'USER_MANAGE', resource: 'USER', action: 'MANAGE', description: 'Manage users' },
    { id: IDS.permissions.SERVICE_READ, code: 'SERVICE_READ', resource: 'SERVICE', action: 'READ', description: 'View services' },
    { id: IDS.permissions.SERVICE_MANAGE, code: 'SERVICE_MANAGE', resource: 'SERVICE', action: 'MANAGE', description: 'Manage services' },
    { id: IDS.permissions.CONTRACT_READ, code: 'CONTRACT_READ', resource: 'CONTRACT', action: 'READ', description: 'View contracts' },
    { id: IDS.permissions.CONTRACT_MANAGE, code: 'CONTRACT_MANAGE', resource: 'CONTRACT', action: 'MANAGE', description: 'Manage contracts' },
    { id: IDS.permissions.BILLING_READ, code: 'BILLING_READ', resource: 'BILLING', action: 'READ', description: 'View billing information' },
    { id: IDS.permissions.BILLING_MANAGE, code: 'BILLING_MANAGE', resource: 'BILLING', action: 'MANAGE', description: 'Manage billing' },
    { id: IDS.permissions.NOTIFICATION_MANAGE, code: 'NOTIFICATION_MANAGE', resource: 'NOTIFICATION', action: 'MANAGE', description: 'Manage notifications' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { resource: permission.resource, action: permission.action, description: permission.description },
      create: { ...permission, createdAt: now },
    });
  }

  // ROLE PERMISSIONS
  const rolePermissions = [
    [IDS.roles.ADMIN, IDS.permissions.USER_READ], [IDS.roles.ADMIN, IDS.permissions.USER_MANAGE], [IDS.roles.ADMIN, IDS.permissions.SERVICE_READ], [IDS.roles.ADMIN, IDS.permissions.SERVICE_MANAGE], [IDS.roles.ADMIN, IDS.permissions.CONTRACT_READ], [IDS.roles.ADMIN, IDS.permissions.CONTRACT_MANAGE], [IDS.roles.ADMIN, IDS.permissions.BILLING_READ], [IDS.roles.ADMIN, IDS.permissions.BILLING_MANAGE], [IDS.roles.ADMIN, IDS.permissions.NOTIFICATION_MANAGE],
    [IDS.roles.CUSTOMER, IDS.permissions.USER_READ], [IDS.roles.CUSTOMER, IDS.permissions.SERVICE_READ], [IDS.roles.CUSTOMER, IDS.permissions.CONTRACT_READ], [IDS.roles.CUSTOMER, IDS.permissions.BILLING_READ],
    [IDS.roles.PROVIDER, IDS.permissions.USER_READ], [IDS.roles.PROVIDER, IDS.permissions.SERVICE_READ], [IDS.roles.PROVIDER, IDS.permissions.SERVICE_MANAGE], [IDS.roles.PROVIDER, IDS.permissions.CONTRACT_READ], [IDS.roles.PROVIDER, IDS.permissions.CONTRACT_MANAGE], [IDS.roles.PROVIDER, IDS.permissions.BILLING_READ], [IDS.roles.PROVIDER, IDS.permissions.BILLING_MANAGE],
  ];

  await prisma.rolePermission.createMany({
    data: rolePermissions.map(([roleId, permissionId]) => ({ roleId, permissionId })),
    skipDuplicates: true,
  });

  // IDENTITIES
  const identities = [
    { id: IDS.identities.ADMIN, email: 'admin@servicehub.com', phone: '0900000001', roleId: IDS.roles.ADMIN, isEkycVerified: true },
    { id: IDS.identities.CUSTOMER_1, email: 'nguyenan@example.com', phone: '0900000002', roleId: IDS.roles.CUSTOMER, isEkycVerified: true },
    { id: IDS.identities.CUSTOMER_2, email: 'tranbinh@example.com', phone: '0900000003', roleId: IDS.roles.CUSTOMER, isEkycVerified: true },
    { id: IDS.identities.CUSTOMER_3, email: 'lechi@example.com', phone: '0900000004', roleId: IDS.roles.CUSTOMER, isEkycVerified: false },
    { id: IDS.identities.CUSTOMER_TRI, email: 'nguyenquoctri@gmail.com', phone: '0900000014', roleId: IDS.roles.CUSTOMER, isEkycVerified: true },
    { id: IDS.identities.PROVIDER_1, email: 'homestay@servicehub.com', phone: '0900000011', roleId: IDS.roles.PROVIDER, isEkycVerified: true },
    { id: IDS.identities.PROVIDER_2, email: 'cleanpro@servicehub.com', phone: '0900000012', roleId: IDS.roles.PROVIDER, isEkycVerified: true },
    { id: IDS.identities.PROVIDER_3, email: 'fixmaster@servicehub.com', phone: '0900000013', roleId: IDS.roles.PROVIDER, isEkycVerified: true },
    { id: IDS.identities.PROVIDER_TRI, email: 'nguyenquoctricc@gmail.com', phone: '0900000015', roleId: IDS.roles.PROVIDER, isEkycVerified: true },
    // Edge cases
    { id: IDS.identities.PROVIDER_PENDING, email: 'pending@servicehub.com', phone: '0900000021', roleId: IDS.roles.PROVIDER, isEkycVerified: false },
    { id: IDS.identities.PROVIDER_REJECTED, email: 'rejected@servicehub.com', phone: '0900000022', roleId: IDS.roles.PROVIDER, isEkycVerified: false },
    { id: IDS.identities.PROVIDER_SUSPENDED, email: 'suspended@servicehub.com', phone: '0900000023', roleId: IDS.roles.PROVIDER, isEkycVerified: true },
    { id: IDS.identities.PROVIDER_EXPIRED, email: 'expired@servicehub.com', phone: '0900000024', roleId: IDS.roles.PROVIDER, isEkycVerified: true },
    { id: IDS.identities.PROVIDER_NO_IMAGES, email: 'noimages@servicehub.com', phone: '0900000025', roleId: IDS.roles.PROVIDER, isEkycVerified: true },
  ];

  await prisma.identity.createMany({
    data: identities.map((identity) => ({
      ...identity,
      passwordHash,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    })),
    skipDuplicates: true,
  });

  // PROVIDERS
  await prisma.provider.createMany({
    data: [
      {
        id: IDS.providers.PROVIDER_1, identityId: IDS.identities.PROVIDER_1,
        providerName: 'ServiceHub Residence', logoUrl: 'https://placehold.co/300x300?text=Residence', bannerUrl: 'https://placehold.co/1200x400?text=Residence',
        numberCard: '012345678901', nameBank: 'Vietcombank', description: 'Quản lý căn hộ và phòng cho thuê', phone: '0900000011', email: 'homestay@servicehub.com', website: 'https://servicehub.com',
        address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM', companyName: 'ServiceHub Residence', taxCode: '0312345678', businessLicenseNumber: 'BL-RES-001',
        representativeName: 'Nguyễn Văn An', representativePosition: 'Manager', businessType: 'COMPANY', status: 'ACTIVE', providerType: 'PROPERTY_MANAGER',
        createdAt: now, updatedAt: now,
      },
      {
        id: IDS.providers.PROVIDER_2, identityId: IDS.identities.PROVIDER_2,
        providerName: 'CleanPro', logoUrl: 'https://placehold.co/300x300?text=CleanPro', bannerUrl: 'https://placehold.co/1200x400?text=CleanPro',
        numberCard: '012345678902', nameBank: 'Techcombank', description: 'Dịch vụ vệ sinh nhà ở chuyên nghiệp', phone: '0900000012', email: 'cleanpro@servicehub.com',
        address: '25 Lê Văn Việt, TP. Thủ Đức, TP.HCM', companyName: 'CleanPro Service', taxCode: '0312345679', businessLicenseNumber: 'BL-CLEAN-001',
        representativeName: 'Trần Văn Bình', representativePosition: 'Director', businessType: 'COMPANY', status: 'ACTIVE', providerType: 'EXTERNAL_SERVICE',
        createdAt: now, updatedAt: now,
      },
      {
        id: IDS.providers.PROVIDER_3, identityId: IDS.identities.PROVIDER_3,
        providerName: 'FixMaster', logoUrl: 'https://placehold.co/300x300?text=FixMaster', bannerUrl: 'https://placehold.co/1200x400?text=FixMaster',
        numberCard: '012345678903', nameBank: 'MB Bank', description: 'Dịch vụ sửa chữa điện nước và thiết bị', phone: '0900000013', email: 'fixmaster@servicehub.com',
        address: '80 Võ Văn Ngân, TP. Thủ Đức, TP.HCM', companyName: 'FixMaster', taxCode: '0312345680', businessLicenseNumber: 'BL-FIX-001',
        representativeName: 'Lê Văn Cường', representativePosition: 'Director', businessType: 'COMPANY', status: 'ACTIVE', providerType: 'EXTERNAL_SERVICE',
        createdAt: now, updatedAt: now,
      },
      {
        id: IDS.providers.PROVIDER_TRI, identityId: IDS.identities.PROVIDER_TRI,
        providerName: 'Nguyễn Quốc Trí Services', logoUrl: 'https://placehold.co/300x300?text=Quoc+Tri', bannerUrl: 'https://placehold.co/1200x400?text=Quoc+Tri',
        numberCard: '012345678904', nameBank: 'ACB', description: 'Cung cấp các dịch vụ tiện ích cho nhà ở', phone: '0900000015', email: 'nguyenquoctricc@gmail.com',
        address: '100 Xa Lộ Hà Nội, TP. Thủ Đức, TP.HCM', companyName: 'Nguyễn Quốc Trí Services', taxCode: '0312345681', businessLicenseNumber: 'BL-TRI-001',
        representativeName: 'Nguyễn Quốc Trí', representativePosition: 'Owner', businessType: 'INDIVIDUAL', status: 'ACTIVE', providerType: 'EXTERNAL_SERVICE',
        createdAt: now, updatedAt: now,
      },
      // Edge cases
      {
        id: IDS.providers.PROVIDER_PENDING, identityId: IDS.identities.PROVIDER_PENDING,
        providerName: 'Pending Provider', logoUrl: 'https://placehold.co/300x300?text=Pending', bannerUrl: 'https://placehold.co/1200x400?text=Pending',
        numberCard: '012345678921', nameBank: 'ACB', description: 'Provider pending approval', phone: '0900000021', email: 'pending@servicehub.com',
        address: 'Q1, TP.HCM', companyName: 'Pending Inc', taxCode: '0312345691', businessLicenseNumber: 'BL-PEN-001',
        representativeName: 'Nguyễn Pending', representativePosition: 'Owner', businessType: 'INDIVIDUAL', status: 'PENDING', providerType: 'EXTERNAL_SERVICE',
        createdAt: now, updatedAt: now,
      },
      {
        id: IDS.providers.PROVIDER_REJECTED, identityId: IDS.identities.PROVIDER_REJECTED,
        providerName: 'Rejected Provider', logoUrl: 'https://placehold.co/300x300?text=Rejected', bannerUrl: 'https://placehold.co/1200x400?text=Rejected',
        numberCard: '012345678922', nameBank: 'ACB', description: 'Provider rejected approval', phone: '0900000022', email: 'rejected@servicehub.com',
        address: 'Q1, TP.HCM', companyName: 'Rejected Inc', taxCode: '0312345692', businessLicenseNumber: 'BL-REJ-001',
        representativeName: 'Nguyễn Rejected', representativePosition: 'Owner', businessType: 'COMPANY', status: 'DISABLE', providerType: 'PROPERTY_MANAGER',
        createdAt: now, updatedAt: now,
      },
      {
        id: IDS.providers.PROVIDER_SUSPENDED, identityId: IDS.identities.PROVIDER_SUSPENDED,
        providerName: 'Suspended Provider', logoUrl: 'https://placehold.co/300x300?text=Suspended', bannerUrl: 'https://placehold.co/1200x400?text=Suspended',
        numberCard: '012345678923', nameBank: 'ACB', description: 'Provider suspended for policy violation', phone: '0900000023', email: 'suspended@servicehub.com',
        address: 'Q2, TP.HCM', companyName: 'Suspended Inc', taxCode: '0312345693', businessLicenseNumber: 'BL-SUS-001',
        representativeName: 'Nguyễn Suspended', representativePosition: 'Owner', businessType: 'COMPANY', status: 'SUSPENDED', providerType: 'EXTERNAL_SERVICE',
        createdAt: now, updatedAt: now,
      },
      {
        id: IDS.providers.PROVIDER_EXPIRED, identityId: IDS.identities.PROVIDER_EXPIRED,
        providerName: 'Expired Docs Provider', logoUrl: 'https://placehold.co/300x300?text=Expired', bannerUrl: 'https://placehold.co/1200x400?text=Expired',
        numberCard: '012345678924', nameBank: 'ACB', description: 'Provider with expired documents', phone: '0900000024', email: 'expired@servicehub.com',
        address: 'Q3, TP.HCM', companyName: 'Expired Inc', taxCode: '0312345694', businessLicenseNumber: 'BL-EXP-001',
        representativeName: 'Nguyễn Expired', representativePosition: 'Owner', businessType: 'COMPANY', status: 'ACTIVE', providerType: 'PROPERTY_MANAGER',
        createdAt: now, updatedAt: now,
      },
      {
        id: IDS.providers.PROVIDER_NO_IMAGES, identityId: IDS.identities.PROVIDER_NO_IMAGES,
        providerName: 'No Images Provider', logoUrl: null, bannerUrl: null,
        numberCard: '012345678925', nameBank: 'ACB', description: 'Provider without images for fallback test', phone: '0900000025', email: 'noimages@servicehub.com',
        address: 'Q4, TP.HCM', companyName: 'NoImages Inc', taxCode: '0312345695', businessLicenseNumber: 'BL-NOI-001',
        representativeName: 'Nguyễn NoImages', representativePosition: 'Owner', businessType: 'COMPANY', status: 'ACTIVE', providerType: 'EXTERNAL_SERVICE',
        createdAt: now, updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  // IDENTITY VERIFICATION
  await prisma.identityVerification.createMany({
    data: [
      { id: IDS.verifications.CUSTOMER_1, identityId: IDS.identities.CUSTOMER_1, provider: 'VNPT eKYC', referenceId: 'EKYC-CUS-001', verificationLevel: 'LEVEL_2', faceSimilarity: 0.9821, livenessScore: 0.9912, providerResponse: { status: 'verified' }, verifiedAt: now, createdAt: now },
      { id: IDS.verifications.PROVIDER_1, identityId: IDS.identities.PROVIDER_1, provider: 'VNPT eKYC', referenceId: 'EKYC-PRO-001', verificationLevel: 'LEVEL_2', faceSimilarity: 0.9755, livenessScore: 0.9888, providerResponse: { status: 'verified' }, verifiedAt: now, createdAt: now },
      { id: IDS.verifications.PROVIDER_2, identityId: IDS.identities.PROVIDER_2, provider: 'VNPT eKYC', referenceId: 'EKYC-PRO-002', verificationLevel: 'LEVEL_2', faceSimilarity: 0.9688, livenessScore: 0.9801, providerResponse: { status: 'verified' }, verifiedAt: now, createdAt: now },
      { id: IDS.verifications.PROVIDER_TRI, identityId: IDS.identities.PROVIDER_TRI, provider: 'VNPT eKYC', referenceId: 'EKYC-PRO-003', verificationLevel: 'LEVEL_2', faceSimilarity: 0.9812, livenessScore: 0.9921, providerResponse: { status: 'verified' }, verifiedAt: now, createdAt: now },
      { id: IDS.verifications.PROVIDER_REJECTED, identityId: IDS.identities.PROVIDER_REJECTED, provider: 'VNPT eKYC', referenceId: 'EKYC-PRO-005', verificationLevel: 'LEVEL_1', faceSimilarity: 0.3200, livenessScore: 0.2100, providerResponse: { status: 'rejected', reason: 'Fake face detected' }, failureReason: 'Liveness fail', verifiedAt: null, createdAt: now },
    ],
    skipDuplicates: true,
  });

  // IDENTITY DOCUMENT
  await prisma.identityDocument.createMany({
    data: [
      { id: '51000000-0000-0000-0000-000000000001', verificationId: IDS.verifications.CUSTOMER_1, documentType: 'CCCD', documentNumber: '079201000001', fullName: 'Nguyễn Văn An', dateOfBirth: new Date('2002-05-15'), gender: 'MALE', nationality: 'Vietnam', issueDate: new Date('2022-01-01'), expiryDate: new Date('2037-01-01'), issuingAuthority: 'Cục Cảnh sát QLHC', frontImageUrl: 'https://placehold.co/800x500?text=CCCD+Front', backImageUrl: 'https://placehold.co/800x500?text=CCCD+Back', selfieImageUrl: 'https://placehold.co/500x500?text=Selfie', ocrRawData: {}, createdAt: now },
      { id: '51000000-0000-0000-0000-000000000002', verificationId: IDS.verifications.PROVIDER_TRI, documentType: 'CCCD', documentNumber: '079201000099', fullName: 'Nguyễn Quốc Trí', dateOfBirth: new Date('2002-08-20'), gender: 'MALE', nationality: 'Vietnam', issueDate: new Date('2022-01-01'), expiryDate: new Date('2037-01-01'), issuingAuthority: 'Cục Cảnh sát QLHC', frontImageUrl: 'https://placehold.co/800x500?text=CCCD+Front', backImageUrl: 'https://placehold.co/800x500?text=CCCD+Back', selfieImageUrl: 'https://placehold.co/500x500?text=Selfie', ocrRawData: {}, createdAt: now },
      { id: '51000000-0000-0000-0000-000000000003', verificationId: IDS.verifications.PROVIDER_REJECTED, documentType: 'CCCD', documentNumber: '079201000088', fullName: 'Nguyễn Rejected', dateOfBirth: new Date('2000-01-01'), gender: 'MALE', nationality: 'Vietnam', issueDate: new Date('2020-01-01'), expiryDate: new Date('2035-01-01'), issuingAuthority: 'Cục Cảnh sát QLHC', frontImageUrl: 'https://placehold.co/800x500?text=Blurry+Front', backImageUrl: 'https://placehold.co/800x500?text=Blurry+Back', selfieImageUrl: 'https://placehold.co/500x500?text=Blurry+Selfie', ocrRawData: {}, createdAt: now },
    ],
    skipDuplicates: true,
  });

  // PROVIDER LEGAL DOCUMENTS
  await prisma.providerLegalDocument.createMany({
    data: [
      { id: '52000000-0000-0000-0000-000000000001', providerId: IDS.providers.PROVIDER_1, documentType: 'BUSINESS_LICENSE', documentName: 'Giấy phép kinh doanh', documentNumber: 'BL-RES-001', fileUrl: 'https://placehold.co/1000x700?text=Business+License', issueDate: new Date('2024-01-01'), verificationStatus: 'VERIFIED', verifiedBy: IDS.identities.ADMIN, verifiedAt: now, note: 'Đã xác minh', createdAt: now },
      { id: '52000000-0000-0000-0000-000000000002', providerId: IDS.providers.PROVIDER_2, documentType: 'BUSINESS_LICENSE', documentName: 'Giấy phép kinh doanh', documentNumber: 'BL-CLEAN-001', fileUrl: 'https://placehold.co/1000x700?text=Business+License', issueDate: new Date('2024-02-01'), verificationStatus: 'VERIFIED', verifiedBy: IDS.identities.ADMIN, verifiedAt: now, note: 'Đã xác minh', createdAt: now },
      { id: '52000000-0000-0000-0000-000000000003', providerId: IDS.providers.PROVIDER_3, documentType: 'BUSINESS_LICENSE', documentName: 'Giấy phép kinh doanh', documentNumber: 'BL-FIX-001', fileUrl: 'https://placehold.co/1000x700?text=Business+License', issueDate: new Date('2024-03-01'), verificationStatus: 'VERIFIED', verifiedBy: IDS.identities.ADMIN, verifiedAt: now, note: 'Đã xác minh', createdAt: now },
      { id: '52000000-0000-0000-0000-000000000004', providerId: IDS.providers.PROVIDER_TRI, documentType: 'OTHER', documentName: 'Hồ sơ đăng ký dịch vụ', documentNumber: 'BL-TRI-001', fileUrl: 'https://placehold.co/1000x700?text=Provider+Document', issueDate: new Date('2025-01-01'), verificationStatus: 'VERIFIED', verifiedBy: IDS.identities.ADMIN, verifiedAt: now, note: 'Đã xác minh', createdAt: now },

      // Edge cases documents
      { id: '52000000-0000-0000-0000-000000000005', providerId: IDS.providers.PROVIDER_PENDING, documentType: 'BUSINESS_LICENSE', documentName: 'Giấy phép chờ duyệt', documentNumber: 'BL-PEN-001', fileUrl: 'https://placehold.co/1000x700?text=Pending+Doc', issueDate: new Date('2026-01-01'), verificationStatus: 'PENDING', verifiedBy: null, verifiedAt: null, note: null, createdAt: now },
      { id: '52000000-0000-0000-0000-000000000006', providerId: IDS.providers.PROVIDER_REJECTED, documentType: 'BUSINESS_LICENSE', documentName: 'Giấy phép giả mạo', documentNumber: 'BL-REJ-001', fileUrl: 'https://placehold.co/1000x700?text=Rejected+Doc', issueDate: new Date('2026-01-01'), verificationStatus: 'REJECTED', verifiedBy: IDS.identities.ADMIN, verifiedAt: now, note: 'Giấy tờ giả mạo, mờ không rõ', createdAt: now },
      { id: '52000000-0000-0000-0000-000000000007', providerId: IDS.providers.PROVIDER_EXPIRED, documentType: 'BUSINESS_LICENSE', documentName: 'Giấy phép hết hạn', documentNumber: 'BL-EXP-001', fileUrl: 'https://placehold.co/1000x700?text=Expired+Doc', issueDate: new Date('2010-01-01'), expiryDate: new Date('2020-01-01'), verificationStatus: 'VERIFIED', verifiedBy: IDS.identities.ADMIN, verifiedAt: now, note: 'Giấy tờ đã hết hạn', createdAt: now },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Identity seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });