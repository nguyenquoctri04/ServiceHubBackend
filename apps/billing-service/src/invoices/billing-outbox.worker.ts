import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxPollerService, RabbitMqEventBusService } from '@app/common';

@Injectable()
export class BillingOutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingOutboxWorker.name);
  private timer?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxPoller: OutboxPollerService,
    private readonly eventBus: RabbitMqEventBusService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 2000);
    this.timer.unref();
    this.logger.log('BillingOutboxWorker đã khởi động (chu kỳ 2s/lần với SKIP LOCKED & Topic Exchange)');
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
      await this.outboxPoller.processPendingMessages(this.prisma, this.eventBus as any, 50);
    } catch (error: any) {
      this.logger.error(`Lỗi trong chu kỳ quét Outbox: ${error?.message || error}`);
    } finally {
      this.isProcessing = false;
    }
  }
}
