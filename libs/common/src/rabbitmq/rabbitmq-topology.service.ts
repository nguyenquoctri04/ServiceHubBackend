import { Injectable, OnModuleInit, Logger, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { SERVICE_IDENTITY } from '../security/secure-rpc.service';
import { ServiceIdentity } from '../security/hmac.type';

export const TOPIC_EXCHANGE = 'servicehub.events';
export const DLX_EXCHANGE = 'servicehub.dlx';
export const DLQ_QUEUE = 'servicehub_dlq';

export const SERVICE_QUEUES = {
  IDENTITY: 'identity_queue',
  CATALOG: 'catalog_queue',
  CONTRACT: 'contract_queue',
  SIGNATURE: 'signature_queue',
  BILLING: 'billing_queue',
  NOTIFICATION: 'notification_queue',
  AUDIT: 'audit_queue',
} as const;

@Injectable()
export class RabbitMqTopologyService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMqTopologyService.name);

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject(SERVICE_IDENTITY) private readonly identity?: ServiceIdentity,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) {
      return;
    }

    // Chỉ chạy khởi tạo Topology 1 lần duy nhất từ API Gateway để không lãng phí connection
    const gatewayName = this.config.get<string>('API_GATEWAY_NAME') || 'api-gateway';
    const isGateway = this.identity?.name === gatewayName;
    if (!isGateway) {
      return;
    }

    try {
      this.logger.log('Đang kiểm tra và khởi tạo RabbitMQ Topology (Exchanges & Queues)...');
      const conn = await amqplib.connect(url);
      const ch = await conn.createChannel();

      // 1. Tạo Exchanges
      await ch.assertExchange(TOPIC_EXCHANGE, 'topic', { durable: true });
      await ch.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });

      // 2. Tạo Dead Letter Queue và bind vào DLX
      await ch.assertQueue(DLQ_QUEUE, { durable: true });
      await ch.bindQueue(DLQ_QUEUE, DLX_EXCHANGE, 'dead_letter');

      // 3. Khởi tạo 7 service queues với thuộc tính Dead Letter
      const queueArgs = {
        'x-dead-letter-exchange': DLX_EXCHANGE,
        'x-dead-letter-routing-key': 'dead_letter',
      };

      for (const queue of Object.values(SERVICE_QUEUES)) {
        await ch.assertQueue(queue, { durable: true, arguments: queueArgs });
      }

      // 4. BINDINGS CHO DOMAIN EVENTS:
      // Lưu ý AMQP 0-9-1 Topic Exchange:
      // Dấu '*' chỉ khớp đúng 1 từ (vd: contract.activated), KHÔNG khớp định dạng version (vd: contract.activated.v1 - 3 từ).
      // Bắt buộc dùng dấu '#' để khớp 0 hoặc nhiều từ.

      // catalog_queue nhận các sự kiện contract (activated, cancelled, terminated)
      await ch.bindQueue(SERVICE_QUEUES.CATALOG, TOPIC_EXCHANGE, 'contract.#');

      // billing_queue nhận các sự kiện contract (cancelled, activation_failed) và violation (fine_imposed)
      await ch.bindQueue(SERVICE_QUEUES.BILLING, TOPIC_EXCHANGE, 'contract.#');
      await ch.bindQueue(SERVICE_QUEUES.BILLING, TOPIC_EXCHANGE, 'violation.#');

      // contract_queue nhận các sự kiện billing (invoice_paid, v.v.)
      await ch.bindQueue(SERVICE_QUEUES.CONTRACT, TOPIC_EXCHANGE, 'billing.#');

      // audit_queue nhận các sự kiện audit (audit.log, v.v.)
      await ch.bindQueue(SERVICE_QUEUES.AUDIT, TOPIC_EXCHANGE, 'audit.#');

      // 5. ĐÓNG KẾT NỐI NGAY LẬP TỨC để trả connection về cho CloudAMQP
      await ch.close();
      await conn.close();

      this.logger.log('✅ RabbitMQ Topology (Exchanges, Queues, Bindings) đã thiết lập thành công!');
    } catch (err: any) {
      this.logger.warn(`Không thể khởi tạo RabbitMQ Topology lúc này (${err?.message || err}). Server sẽ thử lại khi kết nối.`);
    }
  }
}
