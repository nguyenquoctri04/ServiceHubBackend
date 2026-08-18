export interface CreateSignatureKeyResponse {
    id: string;
    keyId: string;
    fingerprint: string;
    publicKey: string;
    algorithm: string;
    status: string;
    createdAt: Date;
    expiresAt: Date | null;
}