import { ClientOptions, CustomClientOptions, RmqOptions, Transport } from '@nestjs/microservices';
import { SERVICE_QUEUES, DLX_EXCHANGE } from '../rabbitmq/rabbitmq-topology.service';
import { SharedClientRMQ } from '../rabbitmq/shared-client-rmq';

export function getRabbitMqOptions(queueName: string, urlStr?: string): RmqOptions {
  const url = urlStr || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  return {
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue: queueName,
      prefetchCount: 20, // Giới hạn luồng nạp tin nhắn, chống nghẽn RAM Node.js
      isGlobalPrefetchCount: false,
      noAck: true, // Auto-ack cho RPC (Tính bền vững đã có Outbox/Inbox đảm bảo)
      queueOptions: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': DLX_EXCHANGE,
          'x-dead-letter-routing-key': 'dead_letter',
        },
      },
      socketOptions: {
        heartbeatIntervalInSeconds: 30, // Tránh rớt socket khi có tác vụ nặng (như render PDF)
        reconnectTimeInSeconds: 5,
      },
    },
  };
}

export function getRabbitMqClientOptions(queueName: string, urlStr?: string): CustomClientOptions {
  const baseOpts = getRabbitMqOptions(queueName, urlStr);
  return {
    customClass: SharedClientRMQ,
    options: {
      ...baseOpts.options,
      noAssert: true,
    },
  };
}
