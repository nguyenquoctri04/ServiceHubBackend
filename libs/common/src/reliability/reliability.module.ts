import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutboxService } from './outbox.service';
import { InboxService } from './inbox.service';
import { OutboxPollerService } from './outbox-poller.service';
import { ReliabilityRetentionService } from './retention.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [OutboxService, InboxService, OutboxPollerService, ReliabilityRetentionService],
  exports: [OutboxService, InboxService, OutboxPollerService, ReliabilityRetentionService],
})
export class ReliabilityModule {}
