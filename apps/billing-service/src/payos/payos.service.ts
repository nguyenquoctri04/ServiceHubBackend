import { Inject, Injectable } from "@nestjs/common";
import { PAYOS_CLIENT } from "./payos.provider";
import { PaymentLink, PayOS, TaxPercentage } from "@payos/node";
import { randomInt } from "crypto";

@Injectable()
export class PayOSService {
    constructor(
        @Inject(PAYOS_CLIENT)
        private readonly payOS: PayOS,
    ) {}

    private generateOrderCode(): number {
        const timestamp = Date.now();
        const random = randomInt(1, 10000);

        return timestamp + random;
    }

    async createPaymentLink(params: {
        amount: number;
        description: string;
        returnUrl: string;
        cancelUrl: string;
        buyerName: string;
        buyerEmail: string;
        buyerAddress: string;
        items: {
            name: string;
            quantity: number;
            price: number;
        }[];
        taxPercentage: TaxPercentage;
    }) {
        const paymentLink = await this.payOS.paymentRequests.create({
            orderCode: this.generateOrderCode(),
            amount: params.amount,
            description: params.description,
            returnUrl: params.returnUrl,
            cancelUrl: params.cancelUrl,
            buyerName: params.buyerName,
            buyerEmail: params.buyerEmail,
            buyerAddress: params.buyerAddress,
            items: params.items,
            invoice: {
                buyerNotGetInvoice: false,
                taxPercentage: params.taxPercentage,
            },
        });

        return {
            orderCode: paymentLink.orderCode,
            paymentLinkId: paymentLink.paymentLinkId,
            checkoutUrl: paymentLink.checkoutUrl,
            qrCode: paymentLink.qrCode,
        };
    }

    async getPaymentLinkStatus(paymentLinkId: string) {
        const paymentLink: PaymentLink = await this.payOS.paymentRequests.get(paymentLinkId);

        return {
            paymentLinkId: paymentLink.id,
            orderCode: paymentLink.orderCode,
            status: paymentLink.status,
            amount: paymentLink.amount,
            amountPaid: paymentLink.amountPaid,
            amountRemaining: paymentLink.amountRemaining,
            paidAt: (() => {
                const transactions = paymentLink.transactions
                    .map((transaction) => transaction.transactionDateTime)
                    .filter(Boolean)
                    .sort();
                return transactions[transactions.length - 1] ?? null;
            })(),
        };
    }
}
