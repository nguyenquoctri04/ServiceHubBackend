import {
    Inject,
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import {
    PayOS,
    type PaymentLink,
    type Webhook,
    type WebhookData,
} from "@payos/node";
import { NotificationPatterns, RedisService } from "@app/common";
import { PrismaService } from "../prisma/prisma.service";
import { PAYOS_CLIENT } from "../payos/payos.provider";
import { firstValueFrom, timeout } from "rxjs";
import { PayOSService } from "../payos/payos.service";

const RECONCILE_SCHEDULE_KEY = "payments:reconcile:schedule";
const RECONCILE_HASH_PREFIX = "payment:reconcile:";
const LEGACY_RECONCILE_TTL_SECONDS = 3 * 24 * 60 * 60;
const RECONCILE_TTL_SECONDS = 20 * 60;
const STATUS_CHECK_COOLDOWN_SECONDS = 90;
const FIRST_CHECK_DELAY_MS = 2 * 60_000;
const RECHECK_DELAY_MS = 2 * 60_000;
const WORKER_INTERVAL_MS = 10_000;
const WORKER_BATCH_SIZE = 50;
const WORKER_CONCURRENCY = 5;
const WORKER_LEASE_MS = 60_000;

@Injectable()
export class CustomerPaymentsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CustomerPaymentsService.name);
    private workerTimer?: NodeJS.Timeout;
    private isProcessingDueLinks = false;

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly payOSService: PayOSService,
        @Inject(PAYOS_CLIENT) private readonly payOS: PayOS,
        @Inject("NOTIFICATION_SERVICE")
        private readonly notificationClient: ClientProxy,
    ) {}

    onModuleInit() {
        this.workerTimer = setInterval(() => {
            void this.processDuePaymentLinks();
        }, WORKER_INTERVAL_MS);
        this.workerTimer.unref();
        void this.processDuePaymentLinks();
    }

    onModuleDestroy() {
        if (this.workerTimer) clearInterval(this.workerTimer);
    }

    async scheduleReconciliation(
        invoiceId: string,
        paymentLinkId: string,
    ) {
        const now = Date.now();
        const nextCheckAt = now + FIRST_CHECK_DELAY_MS;
        const expiresAt = now + RECONCILE_TTL_SECONDS * 1000;
        const client = this.redis.getClient();
        const hashKey = this.getHashKey(paymentLinkId);

        const metadata: Record<string, string> = {
            invoiceId,
            nextCheckAt: String(nextCheckAt),
            expiresAt: String(expiresAt),
        };
        await client
            .multi()
            .hdel(hashKey, "attempts")
            .hset(hashKey, metadata)
            .expire(hashKey, RECONCILE_TTL_SECONDS)
            .zadd(RECONCILE_SCHEDULE_KEY, nextCheckAt, paymentLinkId)
            .exec();
    }

    async getPaymentLinkData(paymentLinkId: string) {
        const [checkoutUrl, qrCode] = await this.redis
            .getClient()
            .hmget(this.getHashKey(paymentLinkId), "checkoutUrl", "qrCode");
        if (!checkoutUrl || !qrCode) return null;
        return { checkoutUrl, qrCode };
    }

    async removeReconciliation(paymentLinkId: string) {
        const client = this.redis.getClient();
        await client
            .multi()
            .del(this.getHashKey(paymentLinkId))
            .zrem(RECONCILE_SCHEDULE_KEY, paymentLinkId)
            .exec();
    }

    async handlePayOsWebhook(body: Webhook) {
        let webhookData: WebhookData;
        try {
            webhookData = await this.payOS.webhooks.verify(body);
        } catch {
            throw new RpcException({
                statusCode: 400,
                message: "Webhook PayOS không hợp lệ.",
            });
        }

        // PayOS also sends signed test or unsuccessful notifications. Acknowledge
        // them, but only reconcile a successful payment notification.
        if (!body.success || webhookData.code !== "00") {
            return { code: "00", desc: "success" };
        }

        const paymentLinkId = webhookData.paymentLinkId;
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { paymentLinkId },
                include: { invoice: true },
            });
            const invoice = payment?.invoice;
            const cachedInvoiceId = await this.getInvoiceId(paymentLinkId);

            // PayOS sends a signed sample webhook while confirming a webhook URL.
            // Unknown links are acknowledged so that this validation request succeeds.
            if (!payment || !invoice || (cachedInvoiceId && cachedInvoiceId !== invoice.id)) {
                return { code: "00", desc: "success" };
            }

            if (invoice.status === "PAID") {
                await this.removeReconciliation(paymentLinkId);
                return { code: "00", desc: "success" };
            }

            const link: PaymentLink =
                await this.payOS.paymentRequests.get(paymentLinkId);

            // ========== Test xong bỏ comment chỗ này ==========
            if (
                link.status === "PAID" 
                // && link.amountPaid >= Number(invoice.total)
            ) {
                const updated = await this.markInvoicePaid(
                    invoice.id,
                    paymentLinkId,
                    this.getPaidAt(link),
                );
                await this.removeReconciliation(paymentLinkId);
                if (updated && invoice.customerId) {
                    await this.notifyPaymentCompleted(
                        invoice.customerId,
                        invoice.id,
                        paymentLinkId,
                    );
                }
            }
        } catch (error) {
            this.logger.error(
                `PayOS webhook reconciliation failed for link ${paymentLinkId}`,
                error instanceof Error ? error.stack : String(error),
            );
            // Return an error so PayOS can retry. Database updates are idempotent.
            throw error;
        }

        return { code: "00", desc: "success" };
    }

    async checkPaymentStatus(invoiceId: string, paymentLinkId: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { paymentLinkId },
            include: { invoice: true },
        });
        if (!payment || payment.invoiceId !== invoiceId) {
            throw new RpcException({
                statusCode: 404,
                message: "Không tìm thấy giao dịch thanh toán.",
            });
        }
        if (payment.invoice.status === "PAID") {
            await this.removeReconciliation(paymentLinkId);
            return {
                checked: false,
                invoiceStatus: "PAID",
                paymentStatus: payment.status,
            };
        }

        const lockKey = `payment:status-check:${paymentLinkId}`;
        const lock = await this.redis
            .getClient()
            .set(lockKey, "1", "EX", STATUS_CHECK_COOLDOWN_SECONDS, "NX");
        if (lock !== "OK") {
            return {
                checked: false,
                invoiceStatus: payment.invoice.status,
                paymentStatus: payment.status,
                retryAfterSeconds: STATUS_CHECK_COOLDOWN_SECONDS,
            };
        }

        const link = await this.payOSService.getPaymentLinkStatus(paymentLinkId);
        const amountPaidInFull =
            link.amountPaid >= Number(payment.invoice.total);

        // ========== Test xong bỏ comment chỗ này ==========
        if (link.status === "PAID"
            // && amountPaidInFull
        ) {
            const updated = await this.markInvoicePaid(
                invoiceId,
                paymentLinkId,
                link.paidAt ? new Date(link.paidAt) : new Date(),
            );
            await this.removeReconciliation(paymentLinkId);
            if (updated && payment.invoice.customerId) {
                await this.notifyPaymentCompleted(
                    payment.invoice.customerId,
                    invoiceId,
                    paymentLinkId,
                );
            }
            return {
                checked: true,
                invoiceStatus: "PAID",
                paymentStatus: "SUCCESS",
                payOSStatus: link.status,
            };
        }

        if (["CANCELLED", "EXPIRED", "FAILED"].includes(link.status)) {
            await this.markPaymentFailed(invoiceId, paymentLinkId);
            await this.removeReconciliation(paymentLinkId);
        }

        return {
            checked: true,
            invoiceStatus: payment.invoice.status,
            paymentStatus: ["CANCELLED", "EXPIRED", "FAILED"].includes(
                link.status,
            )
                ? "FAILED"
                : payment.status,
            payOSStatus: link.status,
        };
    }

    private async processDuePaymentLinks() {
        if (this.isProcessingDueLinks) return;
        this.isProcessingDueLinks = true;

        try {
            const now = Date.now();
            const links = await this.claimDuePaymentLinks(now);
            for (
                let index = 0;
                index < links.length;
                index += WORKER_CONCURRENCY
            ) {
                const batch = links.slice(index, index + WORKER_CONCURRENCY);
                const results = await Promise.allSettled(
                    batch.map((paymentLinkId) =>
                        this.reconcilePaymentLink(paymentLinkId),
                    ),
                );
                for (const result of results) {
                    if (result.status === "rejected") {
                        this.logger.error(
                            "Failed to reconcile a payment link",
                            result.reason instanceof Error
                                ? result.reason.stack
                                : String(result.reason),
                        );
                    }
                }
            }
        } catch (error) {
            this.logger.error(
                "Payment reconciliation worker failed",
                error instanceof Error ? error.stack : String(error),
            );
        } finally {
            this.isProcessingDueLinks = false;
        }
    }

    private async claimDuePaymentLinks(now: number): Promise<string[]> {
        // Claim due entries atomically. If a process dies, its lease expires and
        // another worker can retry the link after WORKER_LEASE_MS.
        const claimScript = `
            local members = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, ARGV[3])
            for _, member in ipairs(members) do
                redis.call('ZADD', KEYS[1], ARGV[2], member)
            end
            return members
        `;
        const result = await this.redis
            .getClient()
            .eval(
                claimScript,
                1,
                RECONCILE_SCHEDULE_KEY,
                String(now),
                String(now + WORKER_LEASE_MS),
                String(WORKER_BATCH_SIZE),
            );
        return Array.isArray(result) ? result.map(String) : [];
    }

    private async reconcilePaymentLink(paymentLinkId: string) {
        const client = this.redis.getClient();
        const hashKey = this.getHashKey(paymentLinkId);
        const metadata = await client.hgetall(hashKey);
        if (!metadata.invoiceId || !metadata.expiresAt) {
            await this.removeReconciliation(paymentLinkId);
            return;
        }

        let expiresAt = Number(metadata.expiresAt);
        const now = Date.now();
        if (
            metadata.attempts !== undefined ||
            expiresAt - now > RECONCILE_TTL_SECONDS * 1000
        ) {
            // Bound entries created by the previous three-day policy as well.
            expiresAt =
                expiresAt - LEGACY_RECONCILE_TTL_SECONDS * 1000 +
                RECONCILE_TTL_SECONDS * 1000;
            if (!Number.isFinite(expiresAt) || expiresAt <= now) {
                await this.removeReconciliation(paymentLinkId);
                return;
            }
            await client
                .multi()
                .hdel(hashKey, "attempts")
                .hset(hashKey, { expiresAt: String(expiresAt) })
                .expire(hashKey, Math.ceil((expiresAt - now) / 1000))
                .exec();
        }
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
            await this.removeReconciliation(paymentLinkId);
            return;
        }

        try {
            const payment = await this.prisma.payment.findUnique({
                where: { paymentLinkId },
                include: { invoice: true },
            });
            const invoice = payment?.invoice;

            if (!payment || !invoice || invoice.id !== metadata.invoiceId) {
                await this.removeReconciliation(paymentLinkId);
                return;
            }

            if (invoice.status === "PAID") {
                await this.removeReconciliation(paymentLinkId);
                return;
            }

            const link: PaymentLink =
                await this.payOS.paymentRequests.get(paymentLinkId);

            // ========== Test xong bỏ comment chỗ này ==========
            if (
                link.status === "PAID" 
                // && link.amountPaid >= Number(invoice.total)
            ) {
                const updated = await this.markInvoicePaid(
                    invoice.id,
                    paymentLinkId,
                    this.getPaidAt(link),
                );
                await this.removeReconciliation(paymentLinkId);
                if (updated && invoice.customerId) {
                    await this.notifyPaymentCompleted(
                        invoice.customerId,
                        invoice.id,
                        paymentLinkId,
                    );
                }
                return;
            }

            if (
                link.status === "EXPIRED" ||
                link.status === "CANCELLED" ||
                link.status === "FAILED"
            ) {
                await this.markPaymentFailed(invoice.id, paymentLinkId);
                await this.removeReconciliation(paymentLinkId);
                return;
            }

            // Check at a fixed interval, but only during the 20-minute window
            // opened by link creation or an explicit customer status check.
            await this.reschedule(paymentLinkId, expiresAt);
        } catch (error) {
            this.logger.warn(
                `Unable to check PayOS link ${paymentLinkId}; will retry: ${error instanceof Error ? error.message : String(error)}`,
            );
            await this.reschedule(paymentLinkId, expiresAt);
        }
    }

    private async reschedule(
        paymentLinkId: string,
        expiresAt: number,
    ) {
        const nextCheckAt = Date.now() + RECHECK_DELAY_MS;
        if (nextCheckAt > expiresAt) {
            await this.removeReconciliation(paymentLinkId);
            return;
        }
        const ttlSeconds = Math.max(
            1,
            Math.ceil((expiresAt - Date.now()) / 1000),
        );
        const client = this.redis.getClient();
        await client
            .multi()
            .hset(this.getHashKey(paymentLinkId), {
                nextCheckAt: String(nextCheckAt),
            })
            .expire(this.getHashKey(paymentLinkId), ttlSeconds)
            .zadd(RECONCILE_SCHEDULE_KEY, nextCheckAt, paymentLinkId)
            .exec();
    }

    private async markInvoicePaid(
        invoiceId: string,
        paymentLinkId: string,
        paidAt: Date,
    ): Promise<boolean> {
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { paymentLinkId },
            });
            if (!payment || payment.invoiceId !== invoiceId) return false;

            const invoiceUpdate = await tx.invoice.updateMany({
                where: { id: invoiceId, status: { not: "PAID" } },
                data: { status: "PAID", updatedAt: new Date() },
            });
            if (invoiceUpdate.count === 0) return false;

            await tx.payment.update({
                where: { id: payment.id },
                data: { paymentMethod: "TRANSFER", status: "SUCCESS", paidAt },
            });
            return true;
        });
    }

    private async markPaymentFailed(invoiceId: string, paymentLinkId: string) {
        await this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { paymentLinkId },
            });
            if (payment?.invoiceId === invoiceId) {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: { status: "FAILED", paidAt: null },
                });
            }
        });
    }

    private async notifyPaymentCompleted(
        userId: string,
        invoiceId: string,
        paymentLinkId: string,
    ) {
        try {
            await firstValueFrom(
                this.notificationClient.send(
                    { cmd: NotificationPatterns.PAYMENT_COMPLETED },
                    { userId, invoiceId, paymentLinkId },
                ).pipe(timeout(3_000)),
            );
        } catch (error) {
            // The DB transaction is already committed; do not make PayOS retry
            // a successful payment just because socket delivery is unavailable.
            this.logger.warn(
                `Could not emit payment completion for invoice ${invoiceId}: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    private async getInvoiceId(paymentLinkId: string) {
        const invoiceId = await this.redis
            .getClient()
            .hget(this.getHashKey(paymentLinkId), "invoiceId");
        return invoiceId;
    }

    private getPaidAt(link: PaymentLink): Date {
        const transactions = link.transactions
            .map((transaction) => transaction.transactionDateTime)
            .filter(Boolean)
            .sort();
        const latestTransaction = transactions[transactions.length - 1];
        if (!latestTransaction) return new Date();

        const vietnamDateTime = latestTransaction.includes("T")
            ? latestTransaction
            : latestTransaction.replace(" ", "T");
        const date = new Date(
            /(?:Z|[+-]\d{2}:?\d{2})$/.test(vietnamDateTime)
                ? vietnamDateTime
                : `${vietnamDateTime}+07:00`,
        );
        return Number.isNaN(date.getTime()) ? new Date() : date;
    }

    private getHashKey(paymentLinkId: string) {
        return `${RECONCILE_HASH_PREFIX}${paymentLinkId}`;
    }
}
