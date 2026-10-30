import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutboxService } from './outbox.service';
import { InboxService } from './inbox.service';
import { OutboxPollerService } from './outbox-poller.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [OutboxService, InboxService, OutboxPollerService],
  exports: [OutboxService, InboxService, OutboxPollerService],
})
export class ReliabilityModule {}
