import { Module } from '@nestjs/common';
import { RepairRequestsController } from './repair-requests.controller';
import { RepairRequestsService } from './repair-requests.service';

@Module({
  controllers: [RepairRequestsController],
  providers: [RepairRequestsService],
})
export class RepairRequestsModule {}
