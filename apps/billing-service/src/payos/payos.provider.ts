import { PayOS } from "@payos/node";

export const PAYOS_CLIENT = Symbol("PAYOS_CLIENT");

export const payOSProvider = {
    provide: PAYOS_CLIENT,
    useFactory: () => {
        const clientId = process.env.PAYOS_CLIENT_ID;
        const apiKey = process.env.PAYOS_API_KEY;
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

        if (!clientId || !apiKey || !checksumKey) {
            throw new Error("Thiếu các biến môi trường bắt buộc của PayOS");
        }

        return new PayOS({
            clientId,
            apiKey,
            checksumKey,
        });
    },
};
