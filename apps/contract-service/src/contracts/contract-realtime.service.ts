import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { NotificationPatterns, SecureRpcService } from '@app/common';

export interface EmitContractStatusParams {
  contractId: string;
  status: string;
  recipientUserIds: (string | undefined | null)[];
}

@Injectable()
export class ContractRealtimeService {
  private readonly logger = new Logger(ContractRealtimeService.name);

  constructor(
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly secureRpc: SecureRpcService,
  ) {}

  /**
   * Phát sự kiện realtime thay đổi trạng thái hợp đồng tới các bên liên quan.
   * Chạy fire-and-forget, bọc lỗi tập trung để không làm gián đoạn transaction chính.
   */
  emitStatusChanged(params: EmitContractStatusParams): void {
    const { contractId, status, recipientUserIds } = params;
    const recipients = recipientUserIds.filter((id): id is string => Boolean(id));
    if (!recipients.length) return;

    this.secureRpc
      .send(
        this.notificationClient,
        { cmd: NotificationPatterns.EMIT_CONTRACT_STATUS_CHANGED },
        {
          contractId,
          status,
          recipientUserIds: recipients,
          occurredAt: new Date().toISOString(),
        },
      )
      .catch((err) => {
        this.logger.warn(
          `[ContractRealtimeService] Không thể phát socket cho hợp đồng ${contractId} (${status}): ${err?.message || err}`,
        );
      });
  }
}
