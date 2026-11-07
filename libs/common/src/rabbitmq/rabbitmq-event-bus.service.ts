import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { TOPIC_EXCHANGE } from './rabbitmq-topology.service';

@Injectable()
export class RabbitMqEventBusService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqEventBusService.name);
  private connection?: amqp.AmqpConnectionManager;
  private channelWrapper?: ChannelWrapper;

  constructor(private readonly config: ConfigService) {}

  /**
   * Kết nối lười (Lazy Connect): Chỉ mở connection khi thực sự có sự kiện cần phát tán (Outbox Worker).
   * Giúp tiết kiệm connection tuyệt đối cho các service không phát domain events.
   */
  private getChannel(): ChannelWrapper {
    if (this.channelWrapper) {
      return this.channelWrapper;
    }

    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) {
      throw new Error('RABBITMQ_URL chưa được cấu hình.');
    }

    this.connection = amqp.connect([url]);
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: any) => {
        await channel.assertExchange(TOPIC_EXCHANGE, 'topic', { durable: true });
      },
    });

    this.channelWrapper.on('connect', () => {
      this.logger.log('✅ RabbitMqEventBusService đã kết nối tới RabbitMQ Broker');
    });

    this.channelWrapper.on('error', (err: any) => {
      this.logger.error(`RabbitMqEventBusService channel error: ${err?.message || err}`);
    });

    return this.channelWrapper;
  }

  /**
   * Phát tán Domain Event lên Topic Exchange.
   * Đóng gói Buffer chuẩn format { pattern, data } tương thích 100% với NestJS Deserializer.
   */
  async emit(eventType: string, envelope: any): Promise<void> {
    const ch = this.getChannel();
    const packet = { pattern: eventType, data: envelope };
    await ch.publish(
      TOPIC_EXCHANGE,
      eventType,
      Buffer.from(JSON.stringify(packet)),
      {
        persistent: true,
        contentType: 'application/json',
      },
    );
  }

  async onModuleDestroy() {
    await this.channelWrapper?.close();
    await this.connection?.close();
  }
}
