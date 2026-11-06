import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Cron } from "@nestjs/schedule";
import type { PayOS, Payout, PayoutBatchRequest } from "@payos/node";
import {
    type LedgerStatus,
    type PayoutBatchStatus,
} from "@prisma/client-billing";
import {
    NotificationPatterns,
    RedisService,
    SecureRpcService,
} from "@app/common";
import { ProviderIdentityPatterns } from "@app/common/constants/provider.patterns";
import { randomUUID } from "node:crypto";
import { firstValueFrom, from, timeout } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import { PAYOS_PAYOUT_CLIENT } from "../payos/payos.provider";

const PAYOUT_RETRY_QUEUE_KEY = "payouts:retry:queue";
const PAYOUT_RETRY_PROCESSING_KEY = "payouts:retry:processing";
const PAYOUT_RETRY_LOCK_KEY = "payouts:retry:worker:lock";
const PAYOUT_RETRY_DEDUPE_PREFIX = "payouts:retry:dedupe:";
const PAYOUT_RETRY_DONE_PREFIX = "payouts:retry:done:";
const PAYOUT_RETRY_DEDUPE_TTL_SECONDS = 90 * 24 * 60 * 60;
const PAYOUT_RETRY_DONE_TTL_SECONDS = 365 * 24 * 60 * 60;
const PAYOUT_RETRY_LOCK_SECONDS = 15 * 60;
const PAYOUT_RETRY_BATCH_SIZE = 10;
const PAYOS_REQUEST_TIMEOUT_MS = 30_000;
const PAYOS_PAYOUT_DESCRIPTION = "Doanh thu ServiceHub";

export interface ProviderPayoutInstruction {
    referenceId: string;
    amount: number;
    description: string;
    toBin: string;
    toAccountNumber: string;
}

export interface PayoutRetryJob {
    jobId: string;
    kind: "PAYOUT" | "NOTIFICATION";
    payoutBatchId?: string;
    referenceId?: string;
    idempotencyKey?: string;
    request?: PayoutBatchRequest;
    invoiceMap?: Record<string, string[]>;
    invoiceAmounts?: Record<string, Record<string, number>>;
    payoutId?: string;
    providerIds?: string[];
    attempt: number;
    enqueuedAt: string;
    /** Giá trị thô của job chỉ được giữ trong bộ nhớ, không ghi ngược lại Redis. */
    queueRaw?: string;
}

interface ProviderPayoutProfile {
    id: string;
    providerName: string;
    status: string;
    accountNumber?: string;
    bankName?: string;
    bin?: string;
}

interface EligibleInvoice {
    invoiceId: string;
    invoiceNumber: string;
    providerId: string;
    amount: number;
}

@Injectable()
export class PayoutsService {
    private readonly logger = new Logger(PayoutsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        @Inject(PAYOS_PAYOUT_CLIENT) private readonly payOS: PayOS,
        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,
        @Inject("NOTIFICATION_SERVICE")
        private readonly notificationClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    /** Mặc định cron kiểm tra mỗi 5 phút trong khung 09:00 vào thứ Hai và thứ Năm. */
    // @Cron("0 */5 9 * * 1,4", { // ========== Test xong xóa comment ==========
    @Cron("0 19 * * * *", {
        name: "provider-payouts-monday-thursday",
        timeZone: "Asia/Ho_Chi_Minh",
    })
    async checkScheduledRun(): Promise<void> {
        console.log("abcd abcd abcd")
        const date = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
        const lockKey = `payouts:scheduler:lock:${date}`;
        const lockToken = randomUUID();

        try {
            const acquired = await this.redis
                .getClient()
                .set(lockKey, lockToken, "EX", 60 * 60 * 30, "NX");
            if (acquired !== "OK") return;
            await this.runScheduledPayout();
        } catch (error) {
            this.logger.error(
                `Scheduled payout run failed: ${this.errorMessage(error)}`,
            );
            await this.releaseLock(lockKey, lockToken);
        }
    }

    /** Worker xử lý hàng đợi thử lại; khóa chỉ cho phép một instance tiêu thụ tại một thời điểm. */
    @Cron("0 * * * * *", {
        name: "provider-payout-retry-worker",
        timeZone: "Asia/Ho_Chi_Minh",
    })
    async processRetryQueue(): Promise<void> {
        const lockToken = randomUUID();
        const client = this.redis.getClient();
        const acquired = await client.set(
            PAYOUT_RETRY_LOCK_KEY,
            lockToken,
            "EX",
            PAYOUT_RETRY_LOCK_SECONDS,
            "NX",
        );
        if (acquired !== "OK") return;

        try {
            await this.recoverInFlightJobs();
            await this.reconcileProcessingBatches();
            for (let index = 0; index < PAYOUT_RETRY_BATCH_SIZE; index += 1) {
                const job = await this.dequeueRetry();
                if (!job) break;

                try {
                    await this.processRetryJob(job);
                    await this.acknowledgeRetry(job);
                } catch (error) {
                    this.logger.error(
                        `Payout retry ${job.jobId} failed: ${this.errorMessage(error)}`,
                    );
                    if (job.kind === "PAYOUT" && job.payoutBatchId) {
                        await this.markBatchUnknown(
                            job.payoutBatchId,
                            this.errorMessage(error),
                        );
                    }
                    await this.requeueRetry(job);
                    // Tránh thử lại liên tục khi PayOS hoặc dịch vụ thông báo đang lỗi.
                    break;
                }
            }
        } catch (error) {
            this.logger.error(
                `Payout retry worker failed: ${this.errorMessage(error)}`,
            );
        } finally {
            await this.releaseLock(PAYOUT_RETRY_LOCK_KEY, lockToken);
        }
    }

    /**
     * Lấy các khoản thu từ hóa đơn đã thanh toán nhưng chưa chi hoặc giữ chỗ,
     * gom số dư theo nhà cung cấp rồi gửi một batch đến PayOS.
     */
    async runScheduledPayout(): Promise<void> {
        const eligibleInvoices = await this.findEligibleInvoices();
        if (eligibleInvoices.length === 0) {
            this.logger.log("No paid invoice balance is eligible for payout.");
            return;
        }

        const invoicesByProvider =
            this.groupInvoicesByProvider(eligibleInvoices);
        const providerProfiles = await this.getProviderProfiles([
            ...invoicesByProvider.keys(),
        ]);
        const invoiceMap: Record<string, string[]> = {};
        const invoiceAmounts: Record<string, Record<string, number>> = {};
        const payoutItems: ProviderPayoutInstruction[] = [];

        for (const [providerId, providerInvoices] of invoicesByProvider) {
            const profile = providerProfiles.get(providerId);
            if (!profile) {
                this.logger.warn(
                    `Skipping payout for unavailable provider ${providerId}.`,
                );
                continue;
            }
            if (!profile.bin || !profile.accountNumber) {
                this.logger.warn(
                    `Skipping payout for provider ${providerId}: bank BIN or account number is missing.`,
                );
                continue;
            }

            const amount = providerInvoices.reduce(
                (sum, invoice) => sum + invoice.amount,
                0,
            );
            if (!Number.isSafeInteger(amount) || amount <= 0) {
                this.logger.warn(
                    `Skipping payout for provider ${providerId}: invalid amount ${amount}.`,
                );
                continue;
            }

            invoiceMap[providerId] = providerInvoices.map(
                (invoice) => invoice.invoiceId,
            );
            invoiceAmounts[providerId] = Object.fromEntries(
                providerInvoices.map((invoice) => [
                    invoice.invoiceId,
                    invoice.amount,
                ]),
            );
            payoutItems.push({
                // Dùng ID nhà cung cấp để ghép giao dịch trả về với invoiceMap.
                referenceId: providerId,
                amount,
                description: PAYOS_PAYOUT_DESCRIPTION,
                toBin: profile.bin,
                toAccountNumber: profile.accountNumber,
            });
        }

        if (payoutItems.length === 0) {
            throw new Error(
                "No eligible provider has a valid bank destination for payout.",
            );
        }

        // Dùng lại mốc thời gian làm referenceId và khóa idempotency của PayOS khi thử lại.
        const referenceId = String(Date.now());
        const request: PayoutBatchRequest = {
            referenceId,
            validateDestination: true,
            category: null,
            payouts: payoutItems,
        };
        const job = await this.enqueueRetry({
            jobId: randomUUID(),
            kind: "PAYOUT",
            payoutBatchId: randomUUID(),
            referenceId,
            idempotencyKey: referenceId,
            request,
            invoiceMap,
            invoiceAmounts,
            attempt: 0,
        });
        // Giữ chỗ các khoản phân bổ hóa đơn trước đợt chi trả kế tiếp.
        // Worker lặp lại bước này theo cách idempotent trước khi gọi PayOS.
        await this.ensureBatchReservation(job);

        this.logger.log(
            `Queued payout batch ${referenceId} for the Redis worker.`,
        );
    }

    /** Lưu job thử lại trước khi chi để có thể khôi phục nếu tiến trình bị dừng đột ngột. */
    async enqueueRetry(
        job: Omit<PayoutRetryJob, "enqueuedAt" | "queueRaw">,
    ): Promise<PayoutRetryJob> {
        const queuedJob: PayoutRetryJob = {
            ...job,
            enqueuedAt: new Date().toISOString(),
        };
        const queueRaw = JSON.stringify(queuedJob);
        const markerKey = `${PAYOUT_RETRY_DEDUPE_PREFIX}${job.jobId}`;
        const completedKey = `${PAYOUT_RETRY_DONE_PREFIX}${job.jobId}`;
        const enqueueScript = `
      if redis.call('EXISTS', KEYS[3]) == 1 then return 0 end
      if redis.call('SET', KEYS[2], '1', 'EX', ARGV[2], 'NX') then
        redis.call('LPUSH', KEYS[1], ARGV[1])
        return 1
      end
      return 0
    `;
        const inserted = await this.redis
            .getClient()
            .eval(
                enqueueScript,
                3,
                PAYOUT_RETRY_QUEUE_KEY,
                markerKey,
                completedKey,
                queueRaw,
                PAYOUT_RETRY_DEDUPE_TTL_SECONDS,
            );
        return inserted === 1 ? { ...queuedJob, queueRaw } : queuedJob;
    }

    /** Chuyển nguyên tử job cũ nhất từ hàng đợi sang danh sách đang xử lý. */
    async dequeueRetry(): Promise<PayoutRetryJob | null> {
        const client = this.redis.getClient();
        const raw = await client.rpoplpush(
            PAYOUT_RETRY_QUEUE_KEY,
            PAYOUT_RETRY_PROCESSING_KEY,
        );
        if (!raw) return null;

        try {
            return { ...(JSON.parse(raw) as PayoutRetryJob), queueRaw: raw };
        } catch (error) {
            await client.lrem(PAYOUT_RETRY_PROCESSING_KEY, 1, raw);
            this.logger.error(
                `Discarding malformed payout retry job: ${this.errorMessage(error)}`,
            );
            return null;
        }
    }

    /** Chỉ xóa job khỏi danh sách đang xử lý sau khi xử lý hoàn tất. */
    async acknowledgeRetry(job: PayoutRetryJob): Promise<void> {
        const multi = this.redis.getClient().multi();
        if (job.queueRaw)
            multi.lrem(PAYOUT_RETRY_PROCESSING_KEY, 1, job.queueRaw);
        multi.del(`${PAYOUT_RETRY_DEDUPE_PREFIX}${job.jobId}`);
        if (job.kind === "NOTIFICATION") {
            multi.set(
                `${PAYOUT_RETRY_DONE_PREFIX}${job.jobId}`,
                "1",
                "EX",
                PAYOUT_RETRY_DONE_TTL_SECONDS,
            );
        }
        await multi.exec();
    }

    /** Đưa job lỗi từ danh sách đang xử lý về hàng đợi và tăng số lần thử. */
    async requeueRetry(job: PayoutRetryJob): Promise<void> {
        const client = this.redis.getClient();
        const { queueRaw, ...storedJob } = job;
        const nextJob = { ...storedJob, attempt: job.attempt + 1 };
        const multi = client.multi();
        if (queueRaw) multi.lrem(PAYOUT_RETRY_PROCESSING_KEY, 1, queueRaw);
        multi.lpush(PAYOUT_RETRY_QUEUE_KEY, JSON.stringify(nextJob));
        await multi.exec();
    }

    /** Xử lý job thử lại lệnh chi PayOS hoặc gửi thông báo cho nhà cung cấp. */
    async processRetryJob(job: PayoutRetryJob): Promise<void> {
        if (job.kind === "NOTIFICATION") {
            const failedProviderIds = await this.notifyProviders(
                job.providerIds ?? [],
                job.payoutBatchId ?? "",
            );
            if (failedProviderIds.length > 0) {
                job.providerIds = failedProviderIds;
                throw new Error(
                    `Could not notify ${failedProviderIds.length} provider(s).`,
                );
            }
            return;
        }

        if (
            !job.payoutBatchId ||
            !job.referenceId ||
            !job.idempotencyKey ||
            !job.request
        ) {
            throw new Error(
                "Payout retry job is missing required request data.",
            );
        }

        await this.ensureBatchReservation(job);
        if (!job.payoutId) {
            // Chuẩn hóa cả job cũ trong Redis để lần retry không bị PayOS từ chối.
            for (const payout of job.request.payouts) {
                payout.description = PAYOS_PAYOUT_DESCRIPTION;
            }
            const created = await this.withTimeout(
                this.payOS.payouts.batch.create(
                    job.request,
                    job.idempotencyKey,
                ),
            );
            job.payoutId = created.id;
        }

        const payout = await this.withTimeout(
            this.payOS.payouts.get(job.payoutId),
        );
        const providerIds = await this.persistPayoutResults(
            job.payoutBatchId,
            payout,
        );
        if (providerIds.length > 0) {
            await this.enqueueRetry({
                jobId: `payout-notification:${job.payoutBatchId}`,
                kind: "NOTIFICATION",
                payoutBatchId: job.payoutBatchId,
                providerIds,
                attempt: 0,
            });
        }
    }

    /** Hỏi lại PayOS các batch còn PROCESSING để đồng bộ trạng thái cuối về CSDL. */
    private async reconcileProcessingBatches(): Promise<void> {
        const batches = await this.prisma.payoutBatch.findMany({
            where: { status: "PROCESSING" },
            orderBy: { createdAt: "asc" },
            take: PAYOUT_RETRY_BATCH_SIZE,
            select: { id: true, batchId: true },
        });

        for (const batch of batches) {
            try {
                const payout = await this.withTimeout(
                    this.payOS.payouts.get(batch.batchId),
                );
                const providerIds = await this.persistPayoutResults(
                    batch.id,
                    payout,
                );
                if (providerIds.length > 0) {
                    await this.enqueueRetry({
                        jobId: `payout-notification:${batch.id}`,
                        kind: "NOTIFICATION",
                        payoutBatchId: batch.id,
                        providerIds,
                        attempt: 0,
                    });
                }
            } catch (error) {
                this.logger.warn(
                    `Could not reconcile payout batch ${batch.batchId}: ${this.errorMessage(error)}`,
                );
            }
        }
    }

    /** Cập nhật batch chi trả và các bút toán Ledger theo hóa đơn trong cùng transaction. */
    async persistPayoutResults(
        batchId: string,
        result: Payout,
    ): Promise<string[]> {
        return this.prisma.$transaction(async (tx) => {
            const batch = await tx.payoutBatch.findUnique({
                where: { id: batchId },
            });
            if (!batch) throw new Error(`Payout batch ${batchId} not found.`);

            await tx.payoutBatch.update({
                where: { id: batchId },
                data: {
                    batchId: result.id,
                    status: result.approvalState as PayoutBatchStatus,
                },
            });

            const entries = await tx.ledger.findMany({
                where: { payoutBatchId: batchId, type: "PAYOUT" },
                select: {
                    id: true,
                    providerId: true,
                    amount: true,
                    status: true,
                },
            });
            const entriesByProvider = new Map<string, typeof entries>();
            for (const entry of entries) {
                const providerEntries =
                    entriesByProvider.get(entry.providerId) ?? [];
                providerEntries.push(entry);
                entriesByProvider.set(entry.providerId, providerEntries);
            }

            const notifiedProviderIds: string[] = [];
            for (const transaction of result.transactions ?? []) {
                const providerEntries = entriesByProvider.get(
                    transaction.referenceId,
                );
                if (!providerEntries?.length) {
                    this.logger.warn(
                        `PayOS returned an unknown payout reference ${transaction.referenceId}.`,
                    );
                    continue;
                }
                const requestedAmount = providerEntries.reduce(
                    (sum, entry) => sum + Number(entry.amount),
                    0,
                );
                const amountMatches =
                    Number(transaction.amount) === requestedAmount;
                const ledgerStatus = amountMatches
                    ? this.mapTransactionStatus(transaction.state)
                    : "UNKNOWN";
                const errorMessage = amountMatches
                    ? transaction.errorMessage
                    : `PayOS payout amount mismatch: expected ${requestedAmount}, received ${transaction.amount}.`;
                const completedAt =
                    ledgerStatus === "SUCCEEDED" ? new Date() : null;

                await tx.ledger.updateMany({
                    where: {
                        payoutBatchId: batchId,
                        providerId: transaction.referenceId,
                        type: "PAYOUT",
                    },
                    data: {
                        status: ledgerStatus,
                        errorMessage: errorMessage || null,
                        completedAt,
                        updatedAt: new Date(),
                    },
                });

                // externalTransactionId là duy nhất trong Ledger nên chỉ lưu trên một dòng phân bổ.
                if (transaction.id) {
                    await tx.ledger.update({
                        where: { id: providerEntries[0].id },
                        data: { externalTransactionId: transaction.id },
                    });
                }
                if (ledgerStatus === "SUCCEEDED") {
                    notifiedProviderIds.push(transaction.referenceId);
                }
            }

            const returnedProviderIds = new Set(
                (result.transactions ?? []).map(
                    (transaction) => transaction.referenceId,
                ),
            );
            for (const [providerId] of entriesByProvider) {
                if (returnedProviderIds.has(providerId)) continue;
                await tx.ledger.updateMany({
                    where: {
                        payoutBatchId: batchId,
                        providerId,
                        type: "PAYOUT",
                    },
                    data: {
                        status: "UNKNOWN",
                        errorMessage:
                            "PayOS response did not include this provider transaction.",
                        updatedAt: new Date(),
                    },
                });
            }

            return notifiedProviderIds;
        });
    }

    /** Chỉ thông báo cho nhà cung cấp sau khi PayOS xác nhận giao dịch chi thành công. */
    async notifyProviders(
        providerIds: string[],
        batchId: string,
    ): Promise<string[]> {
        const failedProviderIds: string[] = [];
        for (const providerId of [...new Set(providerIds)]) {
            try {
                await this.secureRpc.send(
                    this.notificationClient,
                    { cmd: NotificationPatterns.CREATE_IN_APP },
                    {
                        providerId,
                        title: "Đã chuyển doanh thu",
                        content: `Khoản doanh thu trong đợt chi ${batchId} đã được chuyển đến tài khoản ngân hàng của bạn.`,
                    },
                    5_000,
                );
            } catch (error) {
                this.logger.warn(
                    `Provider payout notification failed for ${providerId}: ${this.errorMessage(error)}`,
                );
                failedProviderIds.push(providerId);
            }
        }
        return failedProviderIds;
    }

    private async findEligibleInvoices(): Promise<EligibleInvoice[]> {
        const credits = await this.prisma.ledger.findMany({
            where: {
                type: "INCOME",
                status: "SUCCEEDED",
                invoiceId: { not: null },
                invoice: { is: { status: "PAID" } },
            },
            include: {
                invoice: {
                    select: { id: true, invoiceNumber: true, providerId: true },
                },
            },
        });
        if (credits.length === 0) return [];

        const invoiceIds = credits
            .map((credit) => credit.invoiceId!)
            .filter(Boolean);
        const debits = await this.prisma.ledger.findMany({
            where: {
                type: "PAYOUT",
                invoiceId: { in: invoiceIds },
                status: {
                    in: ["PENDING", "PROCESSING", "SUCCEEDED", "UNKNOWN"],
                },
            },
            select: { invoiceId: true, amount: true },
        });
        const debitedByInvoice = new Map<string, number>();
        for (const debit of debits) {
            if (!debit.invoiceId) continue;
            debitedByInvoice.set(
                debit.invoiceId,
                (debitedByInvoice.get(debit.invoiceId) ?? 0) +
                    Number(debit.amount),
            );
        }

        const eligible: EligibleInvoice[] = [];
        for (const credit of credits) {
            if (!credit.invoice) continue;
            const remaining =
                Number(credit.amount) -
                (debitedByInvoice.get(credit.invoiceId!) ?? 0);
            if (!Number.isSafeInteger(remaining) || remaining <= 0) continue;
            eligible.push({
                invoiceId: credit.invoice.id,
                invoiceNumber: credit.invoice.invoiceNumber,
                providerId: credit.invoice.providerId,
                amount: remaining,
            });
        }
        return eligible;
    }

    private groupInvoicesByProvider(
        invoices: EligibleInvoice[],
    ): Map<string, EligibleInvoice[]> {
        const grouped = new Map<string, EligibleInvoice[]>();
        for (const invoice of invoices) {
            const providerInvoices = grouped.get(invoice.providerId) ?? [];
            providerInvoices.push(invoice);
            grouped.set(invoice.providerId, providerInvoices);
        }
        return grouped;
    }

    private async getProviderProfiles(
        providerIds: string[],
    ): Promise<Map<string, ProviderPayoutProfile>> {
        const profiles = new Map<string, ProviderPayoutProfile>();
        const results = await Promise.allSettled(
            providerIds.map((providerId) =>
                this.secureRpc.send<ProviderPayoutProfile>(
                    this.identityClient,
                    { cmd: ProviderIdentityPatterns.GET_BY_ID },
                    providerId,
                    10_000,
                ),
            ),
        );
        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                profiles.set(providerIds[index], result.value);
            } else {
                this.logger.warn(
                    `Could not get provider payout profile ${providerIds[index]}: ${this.errorMessage(result.reason)}`,
                );
            }
        });
        return profiles;
    }

    private async ensureBatchReservation(job: PayoutRetryJob): Promise<void> {
        const batchId = job.payoutBatchId!;
        const request = job.request!;
        const invoiceAmounts = job.invoiceAmounts ?? {};
        const invoiceMap = job.invoiceMap ?? {};

        for (const item of request.payouts) {
            const providerId = item.referenceId;
            const amounts = invoiceAmounts[providerId];
            const invoiceIds = invoiceMap[providerId] ?? [];
            if (!amounts || invoiceIds.length === 0) {
                throw new Error(
                    `Payout job has no invoice allocation for provider ${providerId}.`,
                );
            }
            const allocatedInvoiceIds = Object.keys(amounts);
            const allocatedTotal = Object.values(amounts).reduce(
                (sum, amount) => sum + amount,
                0,
            );
            if (
                !Number.isSafeInteger(allocatedTotal) ||
                allocatedTotal !== item.amount ||
                allocatedInvoiceIds.length !== invoiceIds.length ||
                allocatedInvoiceIds.some(
                    (invoiceId) => !invoiceIds.includes(invoiceId),
                )
            ) {
                throw new Error(
                    `Payout amount does not match invoice allocation for provider ${providerId}.`,
                );
            }
        }

        await this.prisma.$transaction(async (tx) => {
            const existingBatch = await tx.payoutBatch.findUnique({
                where: { id: batchId },
            });
            if (existingBatch) {
                if (
                    existingBatch.batchId !== job.referenceId &&
                    job.payoutId &&
                    existingBatch.batchId !== job.payoutId
                ) {
                    throw new Error(
                        `Payout batch ${batchId} does not match the retry reference.`,
                    );
                }
            } else {
                await tx.payoutBatch.create({
                    data: {
                        id: batchId,
                        batchId: job.referenceId!,
                        status: "DRAFTING",
                        createdAt: new Date(job.enqueuedAt),
                    },
                });
            }

            for (const [providerId, amountsByInvoice] of Object.entries(
                invoiceAmounts,
            )) {
                const item = request.payouts.find(
                    (payout) => payout.referenceId === providerId,
                );
                if (!item)
                    throw new Error(
                        `Missing PayOS request item for provider ${providerId}.`,
                    );
                for (const [invoiceId, amount] of Object.entries(
                    amountsByInvoice,
                )) {
                    const referenceId = `PAYOUT:${job.referenceId}:${providerId}:${invoiceId}`;
                    const existing = await tx.ledger.findUnique({
                        where: { referenceId },
                    });
                    if (existing) {
                        if (
                            existing.providerId !== providerId ||
                            existing.invoiceId !== invoiceId ||
                            Number(existing.amount) !== amount ||
                            existing.payoutBatchId !== batchId
                        ) {
                            throw new Error(
                                `Conflicting payout ledger reservation ${referenceId}.`,
                            );
                        }
                        continue;
                    }
                    await tx.ledger.create({
                        data: {
                            providerId,
                            invoiceId,
                            payoutBatchId: batchId,
                            type: "PAYOUT",
                            amount,
                            currency: "VND",
                            status: "PENDING",
                            referenceId,
                            idempotencyKey: `${job.idempotencyKey}:${providerId}:${invoiceId}`,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                    });
                }
            }
        });
    }

    private async markBatchUnknown(
        batchId: string,
        reason: string,
    ): Promise<void> {
        try {
            await this.prisma.$transaction([
                this.prisma.payoutBatch.updateMany({
                    where: { id: batchId },
                    data: { status: "PROCESSING" },
                }),
                this.prisma.ledger.updateMany({
                    where: {
                        payoutBatchId: batchId,
                        type: "PAYOUT",
                        status: { in: ["PENDING", "PROCESSING"] },
                    },
                    data: {
                        status: "UNKNOWN",
                        errorMessage: reason,
                        updatedAt: new Date(),
                    },
                }),
            ]);
        } catch (error) {
            this.logger.error(
                `Could not mark payout batch ${batchId} unknown: ${this.errorMessage(error)}`,
            );
        }
    }

    private async recoverInFlightJobs(): Promise<void> {
        const client = this.redis.getClient();
        while (
            await client.rpoplpush(
                PAYOUT_RETRY_PROCESSING_KEY,
                PAYOUT_RETRY_QUEUE_KEY,
            )
        ) {
            // Đưa các job chưa hoàn tất trở lại hàng đợi sau khi worker bị dừng đột ngột.
        }
    }

    private async releaseLock(key: string, token: string): Promise<void> {
        try {
            await this.redis
                .getClient()
                .eval(
                    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                    1,
                    key,
                    token,
                );
        } catch (error) {
            this.logger.warn(
                `Could not release Redis lock ${key}: ${this.errorMessage(error)}`,
            );
        }
    }

    private mapTransactionStatus(state: string): LedgerStatus {
        switch (state) {
            case "SUCCEEDED":
                return "SUCCEEDED";
            case "FAILED":
            case "REVERSED":
                return "FAILED";
            case "CANCELLED":
                return "CANCELLED";
            case "RECEIVED":
            case "PROCESSING":
                return "PROCESSING";
            case "ON_HOLD":
            default:
                return "UNKNOWN";
        }
    }

    private async withTimeout<T>(promise: Promise<T>): Promise<T> {
        return firstValueFrom(
            from(promise).pipe(timeout(PAYOS_REQUEST_TIMEOUT_MS)),
        );
    }

    private errorMessage(error: unknown): string {
        if (error instanceof Error && error.message !== "[object Object]") {
            return error.message;
        }
        if (typeof error === "string") return error;
        if (error && typeof error === "object") {
            const details = error as Record<string, unknown>;
            const nestedError =
                typeof details.getError === "function"
                    ? (details.getError as () => unknown)()
                    : undefined;
            const message =
                (nestedError as Record<string, unknown> | undefined)?.message ??
                details.message ??
                details.error;
            if (typeof message === "string") return message;
            if (message !== undefined) {
                try {
                    return JSON.stringify(message);
                } catch {
                    // Dùng biểu diễn tổng quát bên dưới nếu lỗi không thể tuần tự hóa.
                }
            }
            try {
                return JSON.stringify(error);
            } catch {
                return Object.prototype.toString.call(error);
            }
        }
        return String(error);
    }
}
