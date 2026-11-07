import { ClientRMQ } from '@nestjs/microservices';
import * as amqp from 'amqp-connection-manager';
import { defer, of, Observable } from 'rxjs';

// Chia sẻ 1 TCP connection duy nhất cho tất cả các microservice clients trong cùng 1 process (đặc biệt là API Gateway)
let globalAmqpConnection: amqp.AmqpConnectionManager | null = null;

export class SharedClientRMQ extends ClientRMQ {
  public createClient(): amqp.AmqpConnectionManager {
    if (!globalAmqpConnection) {
      const socketOptions = this.getOptionsProp(this.options, 'socketOptions');
      globalAmqpConnection = amqp.connect(this.urls, socketOptions);
    }
    return globalAmqpConnection;
  }

  /**
   * Khắc phục điểm chết của NestJS ClientRMQ khi dùng chung connection:
   * Nếu connection đã kết nối thành công trước đó (isConnected() === true),
   * sự kiện 'connect' sẽ không phát lại nữa, khiến các client khởi tạo sau bị treo vĩnh viễn.
   * Ta dùng defer() để phát ngay { connection: instance } nếu instance đã sẵn sàng.
   */
  protected override connect$(
    instance: any,
    errorEvent?: string,
    connectEvent?: string,
  ): Observable<any> {
    return defer(() => {
      if (instance && typeof instance.isConnected === 'function' && instance.isConnected()) {
        return of({ connection: instance });
      }
      return super.connect$(instance, errorEvent, connectEvent);
    });
  }

  /**
   * Khi 1 client đóng, chỉ đóng channel riêng của nó, không đóng kết nối TCP dùng chung
   */
  public override close(): void {
    if (this.channel) {
      void this.channel.close();
      this.channel = null;
    }
    this.client = null;
  }
}
