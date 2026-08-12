import { Module } from '@nestjs/common';
import { CustomerIdentitiesController } from './identities.controller';
import { CustomerIdentitiesService } from './identities.service';

@Module({
  controllers: [CustomerIdentitiesController],
  providers: [CustomerIdentitiesService],
  exports: [CustomerIdentitiesService],
})
export class IdentitiesModule {}