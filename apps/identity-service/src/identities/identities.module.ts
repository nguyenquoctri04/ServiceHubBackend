import { Module } from '@nestjs/common';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';

@Module({
  controllers: [IdentitiesController],
  providers: [IdentitiesService],
})
export class IdentitiesModule {}
