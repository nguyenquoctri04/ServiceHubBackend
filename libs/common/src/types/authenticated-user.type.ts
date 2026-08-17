export type UserRole = "CUSTOMER" | "PROVIDER" | "ADMIN";

export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    providerId?: string;
}

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
    providerId?: string;
}
