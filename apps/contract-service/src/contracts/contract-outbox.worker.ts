import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxPollerService } from '@app/common';

/**
 * Worker nền chạy chu kỳ quét Outbox table của contract-service
 * Áp dụng SELECT ... FOR UPDATE SKIP LOCKED chống concurrency race condition giữa các instance.
 */
@Injectable()
export class ContractOutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContractOutboxWorker.name);
  private timer?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxPoller: OutboxPollerService,
    @Inject('BILLING_SERVICE') private readonly brokerClient: ClientProxy,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 2000);
    this.timer.unref();
    this.logger.log('ContractOutboxWorker đã khởi động (chu kỳ 2s/lần với SKIP LOCKED)');
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      await this.outboxPoller.processPendingMessages(this.prisma, this.brokerClient, 50);
    } catch (error: any) {
      this.logger.error(`Lỗi trong chu kỳ quét Contract Outbox: ${error?.message || error}`);
    } finally {
      this.isProcessing = false;
    }
  }
}
