export interface SecureRpcMeta {
    service: string;
    timestamp: number;
    requestId: string;
    pattern: string;
    signature: string;
}

export interface SecureRpcRequest<T = any> {
    meta: SecureRpcMeta;
    data: T;
}

export interface ServiceIdentity {
    name: string;
    secret: string;
}
