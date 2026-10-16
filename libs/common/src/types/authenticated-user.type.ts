export type UserRole = "CUSTOMER" | "PROVIDER" | "ADMIN";

export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    isEkycVerified: boolean;
    providerId: string | null;
}

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
    isEkycVerified: boolean;
    providerId: string | null;
}
