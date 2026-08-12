import { Module } from '@nestjs/common';
import { CustomerTemplatesController } from './templates.controller';
import { CustomerTemplatesService } from './templates.service';

@Module({
  controllers: [CustomerTemplatesController],
  providers: [CustomerTemplatesService],
  exports: [CustomerTemplatesService],
})
export class TemplatesModule {}