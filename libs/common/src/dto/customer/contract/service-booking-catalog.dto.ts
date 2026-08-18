export interface CreateServiceBookingCommand {
    providerId: string;
    customerId: string;
    servicePriceId: string;
    quantity: number;
    requireSignature: boolean;
    fromEmail: string;
}

export interface NotifyServiceRegistrationInput {
    providerUserId: string; // identityId của provider -> Notification.userId (người nhận)
    providerId: string; // Provider.id -> Notification.providerId
    fromEmail: string; // ai đăng ký
    serviceName: string; // đăng ký dịch vụ gì
    contractNumber: string;
    requireSignature: boolean;
    occurredAt: Date; // khi nào
}