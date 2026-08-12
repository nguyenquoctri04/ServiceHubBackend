import { Module } from '@nestjs/common';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';
import { CustomerIdentitiesController } from './customer.identities.controller';
import { CustomerIdentitiesService } from './customer.identities.service';

@Module({
  controllers: [IdentitiesController, CustomerIdentitiesController],
  providers: [IdentitiesService, CustomerIdentitiesService],
})
export class IdentitiesModule {}
