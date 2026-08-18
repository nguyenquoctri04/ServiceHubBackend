export type ProviderType = "PROPERTY_MANAGER" | "EXTERNAL_SERVICE";
export type BusinessType = "INDIVIDUAL" | "HOUSEHOLD" | "COMPANY";
export type ProviderStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DISABLE";

export interface Provider {
    id: string;
    providerName: string;
    logoUrl?: string;
    bannerUrl?: string;
    description?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    companyName?: string;
    taxCode?: string;
    businessLicenseNumber?: string;
    representativeName?: string;
    representativePosition?: string;
    businessType: BusinessType;
    providerType: ProviderType;
    status: ProviderStatus;
    isEkycVerified: boolean;
    createdAt: string;
}

export interface ProviderService {
    id: string;
    name: string;
    description?: string;
    categoryName: string;
    address: string;
    imageUrl?: string;
    price: number;
    unit: string;
    serviceType: "NORMAL" | "ADDITION";
    isFeature: boolean;
    status: "ACTIVE" | "INACTIVE";
}

export interface ProviderProperty {
    id: string;
    propertyName: string;
    description?: string;
    address: string;
    roomCount: number;
    roomTypeCount: number;
    status: "ACTIVE" | "INACTIVE";
}

export interface ProviderLegalDocument {
    id: string;
    documentType: "BUSINESS_LICENSE" | "TAX_CERTIFICATE" | "OTHER";
    documentName?: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
    note?: string;
}

export interface ProviderDetail {
    provider: Provider;
    services: ProviderService[];
    properties: ProviderProperty[];
    legalDocuments: ProviderLegalDocument[];
    stats: {
        serviceCount: number;
        propertyCount: number;
        verifiedDocumentCount: number;
    };
}

// Payload nội bộ giữa các service (không lộ ra FE)
export interface ProviderIdentityDetailRpcResult {
    provider: Provider;
    legalDocuments: ProviderLegalDocument[];
    verifiedDocumentCount: number;
}

export interface ProviderCatalogDetailRpcResult {
    services: ProviderService[];
    properties: ProviderProperty[];
    serviceCount: number;
    propertyCount: number;
}
