import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReliabilityRetentionService,
  OutboxService,
  BillingEventPatterns,
  ProviderContractPatterns,
  SecureRpcService,
} from '@app/common';

@Injectable()
export class BillingMaintenanceWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingMaintenanceWorker.name);
  private purgeTimer?: NodeJS.Timeout;
  private reconcileTimer?: NodeJS.Timeout;
  private isPurging = false;
  private isReconciling = false;
  private lastPurgeDate?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly retentionService: ReliabilityRetentionService,
    private readonly outboxService: OutboxService,
    private readonly secureRpc: SecureRpcService,
    @Inject('CONTRACT_SERVICE') private readonly contractClient: ClientProxy,
  ) {}

  onModuleInit() {
    // 1. Kiểm tra dọn dẹp định kỳ mỗi 60 phút (thực thi lúc 02:00)
    this.purgeTimer = setInterval(() => {
      void this.checkAndPurge();
    }, 60 * 60 * 1000);
    this.purgeTimer.unref();

    // 2. Chạy đối soát chéo mỗi 30 phút (lần đầu sau 1 phút khởi động)
    setTimeout(() => {
      void this.reconcileStaleInvoices();
    }, 60 * 1000);

    this.reconcileTimer = setInterval(() => {
      void this.reconcileStaleInvoices();
    }, 30 * 60 * 1000);
    this.reconcileTimer.unref();

    this.logger.log('BillingMaintenanceWorker đã khởi động (Retention: hàng ngày lúc 02:00, Reconciliation: 30m/lần)');
  }

  onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
    if (this.reconcileTimer) clearInterval(this.reconcileTimer);
  }

  /**
   * Kiểm tra và thực thi dọn dẹp lúc 02:00 sáng hàng ngày
   */
  async checkAndPurge() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentHour = now.getHours();

    // Chạy khi đến khung giờ 2 AM và hôm nay chưa chạy
    if (currentHour === 2 && this.lastPurgeDate !== todayStr) {
      if (this.isPurging) return;
      this.isPurging = true;
      try {
        this.logger.log('[Retention] Bắt đầu dọn dẹp định kỳ 02:00 Outbox và Inbox cũ > 7 ngày...');
        const result = await this.retentionService.purgeOldRecords(this.prisma, {
          olderThanDays: 7,
          batchSize: 1000,
        });
        this.lastPurgeDate = todayStr;
        this.logger.log(`[Retention] Dọn dẹp hoàn tất: ${result.purgedOutbox} Outbox, ${result.purgedInbox} Inbox.`);
      } catch (err: any) {
        this.logger.error(`[Retention] Lỗi dọn dẹp: ${err?.message || err}`);
      } finally {
        this.isPurging = false;
      }
    }
  }

  /**
   * Đối soát chéo các hóa đơn PAID nhưng hợp đồng chưa ACTIVE sau 15 phút
   */
  async reconcileStaleInvoices() {
    if (this.isReconciling) return;
    this.isReconciling = true;

    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const staleInvoices = await this.prisma.invoice.findMany({
        where: {
          status: 'PAID',
          contractId: { not: null },
          updatedAt: { lt: fifteenMinutesAgo },
        },
        take: 50,
      });

      if (staleInvoices.length === 0) return;

      this.logger.log(`[Reconciliation] Quét thấy ${staleInvoices.length} hóa đơn PAID cần đối soát.`);

      for (const invoice of staleInvoices) {
        if (!invoice.contractId) continue;

        try {
          const contract = await this.secureRpc.send<any>(
            this.contractClient,
            { cmd: ProviderContractPatterns.FIND_ONE },
            { providerId: invoice.providerId, contractId: invoice.contractId },
            5000,
          );

          if (contract && (contract.status === 'PENDING_PAYMENT' || contract.status === 'PENDING_SIGNATURE')) {
            this.logger.warn(
              `[Reconciliation] Hóa đơn ${invoice.invoiceNumber} (${invoice.id}) đã PAID nhưng hợp đồng ${contract.contractNumber} vẫn ở trạng thái ${contract.status}. Tiến hành tự phục hồi qua Outbox...`,
            );

            await this.prisma.$transaction(async (tx) => {
              const nextRevision = (invoice.revision || 1) + 1;
              await tx.invoice.update({
                where: { id: invoice.id },
                data: { revision: nextRevision, updatedAt: new Date() },
              });

              await this.outboxService.publishLocal(tx, {
                aggregateType: 'Invoice',
                aggregateId: invoice.id,
                aggregateRevision: nextRevision,
                orderingKey: invoice.contractId || invoice.id,
                eventType: BillingEventPatterns.INVOICE_PAID,
                payload: {
                  invoiceId: invoice.id,
                  contractId: invoice.contractId,
                  customerId: invoice.customerId,
                  providerId: invoice.providerId,
                  amount: Number(invoice.total),
                  paidAt: invoice.updatedAt.toISOString(),
                  reconciled: true,
                },
              });
            });

            this.logger.log(`[Reconciliation] Đã phát lại sự kiện INVOICE_PAID cho hợp đồng ${invoice.contractId}.`);
          }
        } catch (itemErr: any) {
          this.logger.warn(`[Reconciliation] Không thể đối soát hóa đơn ${invoice.id}: ${itemErr?.message || itemErr}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`[Reconciliation] Lỗi trong chu kỳ đối soát: ${error?.message || error}`);
    } finally {
      this.isReconciling = false;
    }
  }
}

