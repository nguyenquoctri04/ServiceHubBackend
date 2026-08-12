export type UserRole = "CUSTOMER" | "PROVIDER" | "ADMIN";

export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
}

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
}
