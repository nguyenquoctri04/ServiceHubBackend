import { PayOS } from "@payos/node";

export const PAYOS_CLIENT = Symbol("PAYOS_CLIENT");
export const PAYOS_PAYOUT_CLIENT = Symbol("PAYOS_PAYOUT_CLIENT");

function createPayOSClient(
    clientId: string | undefined,
    apiKey: string | undefined,
    checksumKey: string | undefined,
    credentialPrefix: string,
): PayOS {
    if (!clientId || !apiKey || !checksumKey) {
        throw new Error(
            `Thiếu các biến môi trường bắt buộc của ${credentialPrefix}`,
        );
    }

    return new PayOS({ clientId, apiKey, checksumKey });
}

export const payOSProvider = {
    provide: PAYOS_CLIENT,
    useFactory: () => {
        return createPayOSClient(
            process.env.PAYOS_CLIENT_ID,
            process.env.PAYOS_API_KEY,
            process.env.PAYOS_CHECKSUM_KEY,
            "PayOS thanh toán",
        );
    },
};

export const payOSPayoutProvider = {
    provide: PAYOS_PAYOUT_CLIENT,
    useFactory: () =>
        createPayOSClient(
            process.env.PAYOS_PAYOUT_CLIENT_ID,
            process.env.PAYOS_PAYOUT_API_KEY,
            process.env.PAYOS_PAYOUT_CHECKSUM_KEY,
            "PayOS chi trả",
        ),
};
