export type IdentityStatus = "ACTIVE" | "INACTIVE";

export type IdentityVerificationStatus =
    | "NOT_VERIFIED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED"
    | "EXPIRED";

export type DigitalSignatureStatus =
    | "NOT_CREATED"
    | "ACTIVE"
    | "REVOKED"
    | "EXPIRED";

export interface PersonalInfo {
    fullName?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    placeOfBirth?: string;
    permanentAddress?: string;
    avatarUrl?: string;
}

export interface ContactInfo {
    email: string;
    phone: string;
}

export interface IdentityVerification {
    status: IdentityVerificationStatus;

    documentType?: string;
    documentNumber?: string;

    frontImageUrl?: string;
    backImageUrl?: string;

    verifiedAt?: string;
    expiredAt?: string;

    failureReason?: string;
}

export interface DigitalSignature {
    status: DigitalSignatureStatus;

    keyId?: string;
    fingerprint?: string;

    publicKey?: string;

    algorithm?: string;

    createdAt?: string;
    expiresAt?: string;

    usageCount: number;
}

export interface CustomerInformation {
    identity: {
        id: string;
        status: IdentityStatus;
        isEkycVerified: boolean;
        createdAt: string;
    };

    personalInfo: PersonalInfo;

    contactInfo: ContactInfo;

    identityVerification: IdentityVerification;
}

export interface AccountSettings {
    identity: {
        id: string;
        status: IdentityStatus;
        isEkycVerified: boolean;
        createdAt: string;
    };

    personalInfo: PersonalInfo;

    contactInfo: ContactInfo;

    identityVerification: IdentityVerification;

    digitalSignature: DigitalSignature;
}
